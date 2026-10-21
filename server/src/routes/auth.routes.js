const router = require('express').Router();
const { login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validators');
const rateLimit = require('express-rate-limit');

// Strict rate limiter for login — security basic (Part C)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: { message: 'Too many login attempts, try again in 15 minutes' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', authenticate, getMe);

module.exports = router;
