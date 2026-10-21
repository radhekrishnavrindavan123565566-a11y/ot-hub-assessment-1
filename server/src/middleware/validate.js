const ApiError = require('../utils/ApiError');

/**
 * Joi-based request validation middleware factory.
 * Usage: validate(schema) where schema is { body, query, params }
 */
const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [key, joiSchema] of Object.entries(schema)) {
    const { error } = joiSchema.validate(req[key], { abortEarly: false });
    if (error) {
      errors.push(...error.details.map((d) => d.message));
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation error', errors));
  }
  next();
};

module.exports = validate;
