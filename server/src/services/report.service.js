const { Signup } = require('../models/Signup');
const { Slot } = require('../models/Slot');
const ApiError = require('../utils/ApiError');

/**
 * Report service — A6: Uses MongoDB aggregation pipelines.
 * No data is loaded into Node.js for computation.
 *
 * Department scoping for managers is done at the Slot level (slotIds filter)
 * so the aggregation pipeline is identical for all roles.
 */
class ReportService {
  async getMonthlyReport(month, requestingUser) {
    const [year, mon] = month.split('-').map(Number);
    if (!year || !mon || mon < 1 || mon > 12) {
      throw ApiError.badRequest('Month must be in YYYY-MM format');
    }

    const startOfMonth = new Date(Date.UTC(year, mon - 1, 1));
    const endOfMonth   = new Date(Date.UTC(year, mon, 1)); // exclusive

    // Scope slots by department for managers (BR-2)
    const slotFilter = { startTime: { $gte: startOfMonth, $lt: endOfMonth } };
    if (requestingUser.role === 'manager') {
      slotFilter.department = requestingUser.department;
    }

    const slotIds = await Slot.find(slotFilter).distinct('_id');

    if (slotIds.length === 0) {
      return { month, results: [], totalHours: 0, employeeCount: 0 };
    }

    const pipeline = [
      // 1. Only approved signups in the scoped slots
      {
        $match: {
          status: 'approved',
          slot: { $in: slotIds },
        },
      },
      // 2. Compute duration from stored timestamps
      {
        $addFields: {
          durationHours: {
            $divide: [
              { $subtract: ['$approvedEndTime', '$approvedStartTime'] },
              3600000,
            ],
          },
        },
      },
      // 3. Group by employee
      {
        $group: {
          _id: '$employee',
          totalHours:    { $sum: '$durationHours' },
          approvedCount: { $sum: 1 },
        },
      },
      // 4. Join employee info
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'employeeInfo',
        },
      },
      { $unwind: '$employeeInfo' },
      // 5. Project clean output
      {
        $project: {
          _id: 0,
          employeeId:       '$_id',
          name:             '$employeeInfo.name',
          email:            '$employeeInfo.email',
          department:       '$employeeInfo.department',
          weeklyOtCapHours: '$employeeInfo.weeklyOtCapHours',
          totalHours:       { $round: ['$totalHours', 2] },
          approvedCount:    1,
        },
      },
      { $sort: { department: 1, name: 1 } },
    ];

    const results = await Signup.aggregate(pipeline);

    const totalHours = results.reduce((sum, r) => sum + r.totalHours, 0);

    return {
      month,
      results,
      totalHours:    Math.round(totalHours * 100) / 100,
      employeeCount: results.length,
    };
  }
}

module.exports = new ReportService();
