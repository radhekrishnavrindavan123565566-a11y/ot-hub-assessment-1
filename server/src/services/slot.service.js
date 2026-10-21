const { Slot } = require('../models/Slot');
const { Signup } = require('../models/Signup');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const { slotDurationHours } = require('../utils/timeUtils');

/**
 * Slot service — enforces BR-1, BR-2, BR-8 and wires up the audit trail.
 */
class SlotService {
  /**
   * BR-1: Validate slot timing rules.
   */
  _validateSlotTimes(date, startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start <= now) {
      throw ApiError.badRequest('Slot must be in the future');
    }
    if (end <= start) {
      throw ApiError.badRequest('End time must be after start time');
    }

    const duration = slotDurationHours(start, end);
    if (duration > 6) {
      throw ApiError.badRequest('Slot cannot be longer than 6 hours');
    }

    // Verify start and end are on the same calendar day (IST).
    // We compare the `date` string against the IST date derived from startTime/endTime.
    const toISTDateStr = (d) => {
      const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      return ist.toISOString().substring(0, 10);
    };
    if (toISTDateStr(start) !== date || toISTDateStr(end) !== date) {
      throw ApiError.badRequest('Slot start and end must fall on the given date (IST)');
    }
  }

  async createSlot({ title, department, date, startTime, endTime, headcountRequired }, managerId) {
    this._validateSlotTimes(date, startTime, endTime);

    const slot = await Slot.create({
      title,
      department,
      date,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      headcountRequired,
      createdBy: managerId,
    });

    await auditService.log({
      action: 'slot_created',
      performedBy: managerId,
      targetSlot: slot._id,
      newValue: { title, department, date, startTime, endTime, headcountRequired },
    });

    return slot;
  }

  /**
   * BR-8: Cannot change date/time if approved signups exist.
   */
  async updateSlot(slotId, updates, managerId) {
    const slot = await Slot.findById(slotId);
    if (!slot) throw ApiError.notFound('Slot not found');
    if (slot.status === 'cancelled') throw ApiError.badRequest('Cannot edit a cancelled slot');

    // BR-2: Manager can only edit their own department
    const manager = await require('../models/User').User.findById(managerId);
    if (slot.department !== manager.department) {
      throw ApiError.forbidden('You can only edit slots in your own department');
    }

    const hasApprovedSignups = await Signup.exists({ slot: slotId, status: 'approved' });

    if (hasApprovedSignups && (updates.date || updates.startTime || updates.endTime)) {
      throw ApiError.conflict(
        'Cannot change date or time when approved signups exist (BR-8). Cancel the slot to reschedule.'
      );
    }

    const newDate = updates.date || slot.date;
    const newStart = updates.startTime ? new Date(updates.startTime) : slot.startTime;
    const newEnd = updates.endTime ? new Date(updates.endTime) : slot.endTime;

    if (updates.date || updates.startTime || updates.endTime) {
      this._validateSlotTimes(newDate, newStart, newEnd);
    }

    const oldValues = {
      title: slot.title,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      headcountRequired: slot.headcountRequired,
    };

    Object.assign(slot, updates);
    if (updates.startTime) slot.startTime = new Date(updates.startTime);
    if (updates.endTime) slot.endTime = new Date(updates.endTime);

    await slot.save();

    await auditService.log({
      action: 'slot_edited',
      performedBy: managerId,
      targetSlot: slot._id,
      previousValue: oldValues,
      newValue: updates,
    });

    return slot;
  }

  async cancelSlot(slotId, managerId) {
    const slot = await Slot.findById(slotId);
    if (!slot) throw ApiError.notFound('Slot not found');
    if (slot.status === 'cancelled') throw ApiError.badRequest('Slot is already cancelled');

    const manager = await require('../models/User').User.findById(managerId);
    if (slot.department !== manager.department) {
      throw ApiError.forbidden('You can only cancel slots in your own department');
    }

    // Cancel all active signups for this slot
    await Signup.updateMany(
      { slot: slotId, status: { $in: ['pending', 'approved'] } },
      { $set: { status: 'withdrawn', withdrawnAt: new Date() } }
    );

    // Decrement approvedCount back — we'll just zero it out
    slot.status = 'cancelled';
    slot.approvedCount = 0;
    slot.cancelledAt = new Date();
    slot.cancelledBy = managerId;
    await slot.save();

    await auditService.log({
      action: 'slot_cancelled',
      performedBy: managerId,
      targetSlot: slotId,
      previousValue: { status: 'open' },
      newValue: { status: 'cancelled' },
    });

    return slot;
  }

  async listSlots({ page = 1, limit = 20, status, department, startDate, endDate } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) filter.startTime.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const skip = (page - 1) * limit;
    const [slots, total] = await Promise.all([
      Slot.find(filter)
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      Slot.countDocuments(filter),
    ]);

    return { slots, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSlotById(slotId) {
    const slot = await Slot.findById(slotId).populate('createdBy', 'name email');
    if (!slot) throw ApiError.notFound('Slot not found');
    return slot;
  }
}

module.exports = new SlotService();
