const Joi = require('joi');
const { DEPARTMENTS, ROLES } = require('../models/User');

const createUserSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid(...ROLES).required(),
    department: Joi.when('role', {
      is: Joi.valid('employee', 'manager'),
      then: Joi.string().valid(...DEPARTMENTS).required(),
      otherwise: Joi.string().valid(...DEPARTMENTS).optional(),
    }),
    weeklyOtCapHours: Joi.number().min(0).max(84).optional(),
  }),
};

const updateOtCapSchema = {
  body: Joi.object({
    weeklyOtCapHours: Joi.number().min(0).max(84).required(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    department: Joi.string().valid(...DEPARTMENTS).optional(),
    role: Joi.string().valid(...ROLES).optional(),
    search: Joi.string().optional(),
  }),
};

module.exports = { createUserSchema, updateOtCapSchema, listUsersSchema };
