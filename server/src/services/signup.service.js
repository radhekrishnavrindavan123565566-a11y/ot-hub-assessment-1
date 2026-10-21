const mongoose = require('mongoose');
const { Signup } = require('../models/Signup');
const { Slot } = require('../models/Slot');
const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const { weekStartIST, weekEndIST, slotDurationHours, doTimesOverlap } = require('../utils/timeUtils');

/**
 * Signup service — enforces BR-3 through BR-7.
 *
 * All business rules are checked here in the service layer, NOT in route handlers.
 */
class SignupService {
  /**
   * BR-3: Employee marks availability for a slot.
   */
  async createSignup(slotId, employeeId) {
    const slot = await Slot.findById(slotId);
    if (!slot) throw ApiError.notFound('Slot not found');
    if (slot.status === 'cancelled') throw ApiError.badRequest('This slot has been cancelled');
    if (slot.status === 'filled') throw ApiError.conflict('This slot is already filled');
    if (new Date(slot.startTime) <= new Date()) {
      throw ApiError.badRequest('Cannot sign up for a slot that has already started');
    }

    const employee = await User.findById(employeeId);

    // BR-2: Department scope
    if (employee.department !== slot.department) {
      throw ApiError.forbidden('You can only sign up for slots in your own department');
    }

    // BR-3: One active signup per slot (the unique partial index also guards this at DB level)
    const existing = await Signup.findOne({
      slot: slotId,
      employee: employeeId,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      throw ApiError.conflict('You already have an active signup for this slot');
    }

    const signup = await Signup.create({ slot: slotId, employee: employeeId });
    return signup.populate('slot');
  }

  /**
   * BR-4, BR-5, BR-6: Manager approves or rejects a signup.
   * Uses a session + transaction so concurrent approvals don't over-fill a slot.
   */
  async decideSignup(signupId, decision, managerId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const signup = await Signup.findById(signupId).session(session).populate('slot');
      if (!signup) throw ApiError.notFound('Signup not found');
      if (signup.status !== 'pending') {
        throw ApiError.badRequest(`Signup is already ${signup.status}`);
      }

      const slot = signup.slot;
      if (slot.status === 'cancelled') throw ApiError.badRequest('Slot has been cancelled');

      // BR-2: Manager owns this department
      const manager = await User.findById(managerId).session(session);
      if (slot.department !== manager.department) {
        throw ApiError.forbidden('You can only manage signups in your own department');
      }

      if (decision === 'rejected') {
        signup.status = 'rejected';
        signup.decidedBy = managerId;
        signup.decidedAt = new Date();
        await signup.save({ session });

        await auditService.log({
          action: 'signup_rejected',
          performedBy: managerId,
          targetUser: signup.employee,
          targetSignup: signup._id,
          targetSlot: slot._id,
        });

        await session.commitTransaction();
        return signup;
      }

      // ─── APPROVE path ────────────────────────────────────────────────────────

      // BR-4: Re-check headcount with a lock (re-read inside transaction)
      const freshSlot = await Slot.findById(slot._id).session(session);
      if (freshSlot.approvedCount >= freshSlot.headcountRequired) {
        throw ApiError.conflict(
          `Headcount limit of ${freshSlot.headcountRequired} already reached (BR-4)`
        );
      }

      const employee = await User.findById(signup.employee).session(session);

      // BR-5: Overlap check — get all approved signups for this employee
      const approvedSignups = await Signup.find({
        employee: signup.employee,
        status: 'approved',
      })
        .populate('slot', 'startTime endTime')
        .session(session);

      for (const as of approvedSignups) {
        if (doTimesOverlap(slot.startTime, slot.endTime, as.slot.startTime, as.slot.endTime)) {
          throw ApiError.conflict(
            `Overlap with an already-approved slot (${as.slot.startTime.toISOString()} – ${as.slot.endTime.toISOString()}) (BR-5)`
          );
        }
      }

      // BR-6: Weekly cap check
      const weekStart = weekStartIST(slot.startTime);
      const weekEnd = weekEndIST(slot.startTime);

      const weeklyApproved = await Signup.find({
        employee: signup.employee,
        status: 'approved',
        approvedStartTime: { $gte: weekStart, $lte: weekEnd },
      })
        .populate('slot', 'startTime endTime')
        .session(session);

      const usedHours = weeklyApproved.reduce((sum, s) => {
        return sum + slotDurationHours(s.approvedStartTime, s.approvedEndTime);
      }, 0);

      const newSlotHours = slotDurationHours(slot.startTime, slot.endTime);
      const projectedHours = usedHours + newSlotHours;

      if (projectedHours > employee.weeklyOtCapHours) {
        throw ApiError.conflict(
          `Approving would bring weekly OT to ${projectedHours.toFixed(1)} h; the cap is ${employee.weeklyOtCapHours} h (BR-6)`
        );
      }

      // All checks passed — approve
      signup.status = 'approved';
      signup.decidedBy = managerId;
      signup.decidedAt = new Date();
      signup.approvedStartTime = slot.startTime;
      signup.approvedEndTime = slot.endTime;
      await signup.save({ session });

      freshSlot.approvedCount += 1;
      if (freshSlot.approvedCount >= freshSlot.headcountRequired) {
        freshSlot.status = 'filled';
      }
      await freshSlot.save({ session });

      await auditService.log({
        action: 'signup_approved',
        performedBy: managerId,
        targetUser: signup.employee,
        targetSignup: signup._id,
        targetSlot: slot._id,
        newValue: { projectedWeeklyHours: projectedHours },
      });

      await session.commitTransaction();
      return signup;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * BR-7: Employee withdraws their signup.
   * Pending: any time. Approved: up to 24 h before slot starts.
   */
  async withdrawSignup(signupId, employeeId) {
    const signup = await Signup.findById(signupId).populate('slot');
    if (!signup) throw ApiError.notFound('Signup not found');

    if (signup.employee.toString() !== employeeId.toString()) {
      throw ApiError.forbidden('You can only withdraw your own signups');
    }

    if (!['pending', 'approved'].includes(signup.status)) {
      throw ApiError.badRequest(`Cannot withdraw a signup with status '${signup.status}'`);
    }

    if (signup.status === 'approved') {
      const hoursUntilStart = (new Date(signup.slot.startTime) - new Date()) / (1000 * 60 * 60);
      if (hoursUntilStart < 24) {
        throw ApiError.badRequest(
          'Approved signups can only be withdrawn more than 24 hours before the slot starts (BR-7)'
        );
      }

      // Reopen slot if it was filled
      await Slot.findByIdAndUpdate(signup.slot._id, {
        $inc: { approvedCount: -1 },
        $set: { status: 'open' },
      });
    }

    signup.status = 'withdrawn';
    signup.withdrawnAt = new Date();
    await signup.save();

    await auditService.log({
      action: 'signup_withdrawn',
      performedBy: employeeId,
      targetUser: employeeId,
      targetSignup: signup._id,
      targetSlot: signup.slot._id,
      previousValue: { status: 'approved' },
      newValue: { status: 'withdrawn' },
    });

    return signup;
  }

  async listSignupsForSlot(slotId, managerId) {
    const slot = await Slot.findById(slotId);
    if (!slot) throw ApiError.notFound('Slot not found');

    const manager = await User.findById(managerId);
    if (slot.department !== manager.department) {
      throw ApiError.forbidden('You can only view signups for your own department');
    }

    const signups = await Signup.find({ slot: slotId })
      .populate('employee', 'name email department weeklyOtCapHours')
      .populate('decidedBy', 'name')
      .lean();

    // Attach current week hours for each employee (for manager's pre-approval view)
    const weekStart = weekStartIST(slot.startTime);
    const weekEnd = weekEndIST(slot.startTime);

    const enriched = await Promise.all(
      signups.map(async (s) => {
        const weekly = await Signup.find({
          employee: s.employee._id,
          status: 'approved',
          approvedStartTime: { $gte: weekStart, $lte: weekEnd },
        });
        const usedHours = weekly.reduce(
          (sum, w) => sum + slotDurationHours(w.approvedStartTime, w.approvedEndTime),
          0
        );
        return { ...s, employee: { ...s.employee, currentWeekOtHours: usedHours } };
      })
    );

    return enriched;
  }

  async getMySignups(employeeId, { page = 1, limit = 20, status } = {}) {
    const filter = { employee: employeeId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [signups, total] = await Promise.all([
      Signup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('slot', 'title department date startTime endTime status')
        .lean(),
      Signup.countDocuments(filter),
    ]);

    return { signups, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMyWeeklyOtHours(employeeId) {
    const now = new Date();
    const weekStart = weekStartIST(now);
    const weekEnd = weekEndIST(now);

    const signups = await Signup.find({
      employee: employeeId,
      status: 'approved',
      approvedStartTime: { $gte: weekStart, $lte: weekEnd },
    });

    return signups.reduce(
      (sum, s) => sum + slotDurationHours(s.approvedStartTime, s.approvedEndTime),
      0
    );
  }
}

module.exports = new SignupService();
