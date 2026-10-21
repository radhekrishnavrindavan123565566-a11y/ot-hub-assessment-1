const router = require('express').Router();
const { login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validators');
const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter.
 *
 * `validate: { xForwardedForHeader: false }` suppresses the Vercel/proxy
 * warning; the real protection comes from `app.set('trust proxy', 1)` in
 * app.js which tells Express — and therefore rate-limit — to trust the
 * X-Forwarded-For header supplied by Vercel's edge network.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip validation warning — trust proxy is set at the app level
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: { message: 'Too many login attempts. Please wait 15 minutes and try again.' },
  },
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', authenticate, getMe);

module.exports = router;
