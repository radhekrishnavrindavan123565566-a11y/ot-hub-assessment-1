const router = require('express').Router();
const { getMonthlyReport } = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/monthly', authorize('admin', 'manager'), getMonthlyReport);

module.exports = router;
