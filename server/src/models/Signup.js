const mongoose = require('mongoose');

const SIGNUP_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

const signupSchema = new mongoose.Schema(
  {
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: SIGNUP_STATUSES,
      default: 'pending',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decidedAt: Date,
    withdrawnAt: Date,
    // Snapshot of slot times at approval time, used for overlap checks
    approvedStartTime: Date,
    approvedEndTime: Date,
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// BR-3: enforce one active signup per (employee, slot) at the DB level
signupSchema.index(
  { slot: 1, employee: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
  }
);
// Fast lookup: all approved signups for an employee (overlap + cap checks)
signupSchema.index({ employee: 1, status: 1, approvedStartTime: 1 });
// Manager reviewing signups for a slot
signupSchema.index({ slot: 1, status: 1 });

const Signup = mongoose.model('Signup', signupSchema);

module.exports = { Signup, SIGNUP_STATUSES };
