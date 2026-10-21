const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'signup_approved',
  'signup_rejected',
  'signup_withdrawn',
  'slot_cancelled',
  'ot_cap_changed',
  'slot_created',
  'slot_edited',
  'user_created',
];

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    targetSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
    },
    targetSignup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Signup',
    },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed, // extra context (e.g. reason)
  },
  {
    timestamps: true,
    // Audit logs are append-only; disable versionKey
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Admin pages: paginated, sorted by newest first
auditLogSchema.index({ createdAt: -1 });
// Filter by action type
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog, AUDIT_ACTIONS };
