const reportService = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getMonthlyReport = asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!month) throw ApiError.badRequest('month query param is required (YYYY-MM)');

  const report = await reportService.getMonthlyReport(month, req.user);
  res.json({ success: true, data: report });
});

module.exports = { getMonthlyReport };
