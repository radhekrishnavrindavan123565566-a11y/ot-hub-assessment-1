const { AuditLog } = require('../models/AuditLog');

/**
 * Append-only audit trail service.
 * All significant actions (approvals, rejections, cancellations, cap changes) pass through here.
 */
class AuditService {
  async log({ action, performedBy, targetUser, targetSlot, targetSignup, previousValue, newValue, metadata }) {
    return AuditLog.create({
      action,
      performedBy,
      targetUser,
      targetSlot,
      targetSignup,
      previousValue,
      newValue,
      metadata,
    });
  }

  async getAuditLogs({ page = 1, limit = 20, action } = {}) {
    const filter = {};
    if (action) filter.action = action;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'name email role')
        .populate('targetUser', 'name email')
        .populate('targetSlot', 'title department date')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

module.exports = new AuditService();
