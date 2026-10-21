const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const slotRoutes = require('./routes/slot.routes');
const signupRoutes = require('./routes/signup.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');

// Inline /api/me/signups route
const { authenticate, authorize } = require('./middleware/auth');
const validate = require('./middleware/validate');
const { getMySignups } = require('./controllers/signup.controller');
const { listMySignupsSchema } = require('./validators/signup.validators');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — explicit allowlist, not wildcard ───────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── NoSQL injection guard ─────────────────────────────────────────────────────
app.use(mongoSanitize());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging (dev only) ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/signups', signupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);

// GET /api/me/signups — employee's own signup history + weekly stats
// Defined here directly to avoid router nesting confusion
app.get(
  '/api/me/signups',
  authenticate,
  authorize('employee'),
  validate(listMySignupsSchema),
  getMySignups
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found` },
  });
});

// ── Central error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
