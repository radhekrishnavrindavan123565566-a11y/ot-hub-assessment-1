const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEPARTMENTS = ['Machining', 'Assembly', 'Quality', 'Dispatch'];
const ROLES = ['employee', 'manager', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned in queries by default (security)
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      // Required for employees and managers; admin has no department
      required: function () {
        return this.role !== 'admin';
      },
    },
    weeklyOtCapHours: {
      type: Number,
      default: 12,
      min: [0, 'Cap cannot be negative'],
      max: [84, 'Cap cannot exceed 84 hours per week'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// email is already unique-indexed by the unique: true constraint above.
// Index department for fast scoped queries (managers listing their team).
userSchema.index({ department: 1, role: 1 });

// ── Password hashing hook ─────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: password comparison ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Serialization: strip password even if select: false is bypassed ───────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = { User, DEPARTMENTS, ROLES };
