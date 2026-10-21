const Joi = require('joi');
const { DEPARTMENTS } = require('../models/User');
const { SLOT_STATUSES } = require('../models/Slot');

const createSlotSchema = {
  body: Joi.object({
    title: Joi.string().trim().max(200).required(),
    department: Joi.string().valid(...DEPARTMENTS).required(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    startTime: Joi.string().isoDate().required(),
    endTime: Joi.string().isoDate().required(),
    headcountRequired: Joi.number().min(1).max(50).required(),
  }),
};

const updateSlotSchema = {
  body: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: Joi.string().isoDate().optional(),
    endTime: Joi.string().isoDate().optional(),
    headcountRequired: Joi.number().min(1).max(50).optional(),
  }).min(1),
  params: Joi.object({ id: Joi.string().required() }),
};

const listSlotsSchema = {
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string().valid(...SLOT_STATUSES).optional(),
    department: Joi.string().valid(...DEPARTMENTS).optional(),
    startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

module.exports = { createSlotSchema, updateSlotSchema, listSlotsSchema };
