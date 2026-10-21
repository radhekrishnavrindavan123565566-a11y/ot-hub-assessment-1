const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/asyncHandler');

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action } = req.query;
  const result = await auditService.getAuditLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    action,
  });
  res.json({ success: true, data: result });
});

module.exports = { getAuditLogs };
