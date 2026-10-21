const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

/**
 * Central error-handling middleware.
 * All errors funnel here — both operational (ApiError) and unexpected.
 * Always returns the same JSON shape:
 *   { success: false, error: { message, ...[details] } }
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details },
    });
  }

  // Mongoose duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { message: `Duplicate value for ${field}` },
    });
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid ID format' },
    });
  }

  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Unknown / programming error — log full stack
  logger.error('Unhandled error', { message: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' },
  });
};

module.exports = errorHandler;
