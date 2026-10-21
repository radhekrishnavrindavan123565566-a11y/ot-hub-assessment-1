const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');

class UserService {
  async createUser(data, adminId) {
    const existing = await User.findOne({ email: data.email });
    if (existing) throw ApiError.conflict('Email already in use');

    const user = await User.create(data);

    await auditService.log({
      action: 'user_created',
      performedBy: adminId,
      targetUser: user._id,
      newValue: { name: user.name, email: user.email, role: user.role, department: user.department },
    });

    return user;
  }

  async listUsers({ page = 1, limit = 20, department, role, search } = {}, requestingUser) {
    const filter = {};

    // Managers can only see their own department
    if (requestingUser.role === 'manager') {
      filter.department = requestingUser.department;
    } else {
      if (department) filter.department = department;
      if (role) filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateOtCap(userId, weeklyOtCapHours, adminId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role !== 'employee') throw ApiError.badRequest('OT cap only applies to employees');

    const previousCap = user.weeklyOtCapHours;
    user.weeklyOtCapHours = weeklyOtCapHours;
    await user.save();

    await auditService.log({
      action: 'ot_cap_changed',
      performedBy: adminId,
      targetUser: userId,
      previousValue: { weeklyOtCapHours: previousCap },
      newValue: { weeklyOtCapHours },
    });

    return user;
  }
}

module.exports = new UserService();
