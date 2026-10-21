const mongoose = require('mongoose');
const { DEPARTMENTS } = require('./User');

const SLOT_STATUSES = ['open', 'filled', 'cancelled'];

const slotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      required: true,
    },
    date: {
      // Stored as YYYY-MM-DD string for human-readability; times stored as full UTC Dates
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    headcountRequired: {
      type: Number,
      required: true,
      min: [1, 'At least 1 person required'],
      max: [50, 'Headcount cannot exceed 50'],
    },
    approvedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: SLOT_STATUSES,
      default: 'open',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Employees frequently list open slots for their department
slotSchema.index({ department: 1, status: 1, startTime: 1 });
// Managers filter by department + date range
slotSchema.index({ department: 1, startTime: 1 });

const Slot = mongoose.model('Slot', slotSchema);

module.exports = { Slot, SLOT_STATUSES };
