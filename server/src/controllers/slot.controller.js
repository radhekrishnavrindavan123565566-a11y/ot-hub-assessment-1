const slotService = require('../services/slot.service');
const asyncHandler = require('../utils/asyncHandler');

const createSlot = asyncHandler(async (req, res) => {
  // BR-2: Managers can only create for their own department
  if (req.body.department && req.body.department !== req.user.department) {
    const ApiError = require('../utils/ApiError');
    throw ApiError.forbidden('You can only create slots for your own department');
  }
  // Enforce department from the authenticated manager
  req.body.department = req.user.department;

  const slot = await slotService.createSlot(req.body, req.user._id);
  res.status(201).json({ success: true, data: { slot } });
});

const listSlots = asyncHandler(async (req, res) => {
  const query = { ...req.query };

  // Role-based scoping
  if (req.user.role === 'employee') {
    query.department = req.user.department;
  } else if (req.user.role === 'manager') {
    query.department = req.user.department;
  }
  // admin sees all — no department restriction

  const result = await slotService.listSlots(query);
  res.json({ success: true, data: result });
});

const getSlot = asyncHandler(async (req, res) => {
  const slot = await slotService.getSlotById(req.params.id);
  res.json({ success: true, data: { slot } });
});

const updateSlot = asyncHandler(async (req, res) => {
  const slot = await slotService.updateSlot(req.params.id, req.body, req.user._id);
  res.json({ success: true, data: { slot } });
});

const cancelSlot = asyncHandler(async (req, res) => {
  const slot = await slotService.cancelSlot(req.params.id, req.user._id);
  res.json({ success: true, data: { slot } });
});

module.exports = { createSlot, listSlots, getSlot, updateSlot, cancelSlot };
