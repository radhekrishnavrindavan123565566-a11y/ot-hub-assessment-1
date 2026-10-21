const Joi = require('joi');

const signupDecisionSchema = {
  body: Joi.object({
    decision: Joi.string().valid('approved', 'rejected').required(),
  }),
  params: Joi.object({ id: Joi.string().required() }),
};

const listMySignupsSchema = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'withdrawn').optional(),
  }),
};

module.exports = { signupDecisionSchema, listMySignupsSchema };
