require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

/**
 * Local dev / long-running server entry point.
 *
 * On Vercel, this file is NOT executed directly — Vercel imports app.js
 * (the Express app) via the vercel.json `builds` config and calls it as a
 * serverless function. The DB connection is handled lazily inside app.js.
 *
 * Locally, we start the HTTP server here.
 */
const server = app.listen(PORT, () => {
  logger.info(`OT Hub server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

// Export for Vercel (it imports this module and uses the Express app)
module.exports = app;
