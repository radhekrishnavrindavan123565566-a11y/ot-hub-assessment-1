const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const slotRoutes    = require('./routes/slot.routes');
const signupRoutes  = require('./routes/signup.routes');
const reportRoutes  = require('./routes/report.routes');
const auditRoutes   = require('./routes/audit.routes');

// Inline /api/me/signups
const { authenticate, authorize } = require('./middleware/auth');
const validate = require('./middleware/validate');
const { getMySignups } = require('./controllers/signup.controller');
const { listMySignupsSchema } = require('./validators/signup.validators');

const app = express();

// ── Trust proxy (REQUIRED on Vercel / any load-balancer) ─────────────────────
// Vercel sits behind a reverse proxy that sets X-Forwarded-For.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and Mongoose can't log the real client IP.
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL      || 'http://localhost:5173',
  process.env.CLIENT_URL_PROD || 'https://ot-hub.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / curl (no origin header) and all whitelisted origins
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, also allow any localhost port
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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

// ── HTTP request logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── DB connection middleware (lazy, cached — Vercel safe) ─────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    logger.error('DB connection failed:', err.message);
    // Return the real reason so it shows in Vercel logs and client response
    res.status(503).json({
      success: false,
      error: {
        message: 'Database unavailable',
        reason: process.env.NODE_ENV !== 'production' ? err.message : 'Check server environment variables',
      },
    });
  }
});

// ── Health check (also shows env var status for debugging) ───────────────────
app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    // Show presence (not values) of critical env vars so you can debug Vercel
    config: {
      MONGODB_URI:    !!process.env.MONGODB_URI,
      JWT_SECRET:     !!process.env.JWT_SECRET,
      CLIENT_URL_PROD:!!process.env.CLIENT_URL_PROD,
    },
  })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/slots',      slotRoutes);
app.use('/api/signups',    signupRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/audit-logs', auditRoutes);

// GET /api/me/signups — employee's own signup history + weekly stats
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
