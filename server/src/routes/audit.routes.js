const router = require('express').Router();
const { getAuditLogs } = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin'), getAuditLogs);

module.exports = router;
