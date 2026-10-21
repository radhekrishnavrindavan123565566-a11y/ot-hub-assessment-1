const router = require('express').Router();
const { decideSignup, withdrawSignup, getMySignups } = require('../controllers/signup.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { signupDecisionSchema, listMySignupsSchema } = require('../validators/signup.validators');

router.use(authenticate);

// PATCH /api/signups/:id/decision  — Manager approves or rejects
router.patch('/:id/decision', authorize('manager'), validate(signupDecisionSchema), decideSignup);

// DELETE /api/signups/:id  — Employee withdraws
router.delete('/:id', authorize('employee'), withdrawSignup);

module.exports = router;
