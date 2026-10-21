const signupService = require('../services/signup.service');
const asyncHandler = require('../utils/asyncHandler');

const createSignup = asyncHandler(async (req, res) => {
  const signup = await signupService.createSignup(req.params.id, req.user._id);
  res.status(201).json({ success: true, data: { signup } });
});

const listSignupsForSlot = asyncHandler(async (req, res) => {
  const signups = await signupService.listSignupsForSlot(req.params.id, req.user._id);
  res.json({ success: true, data: { signups } });
});

const decideSignup = asyncHandler(async (req, res) => {
  const signup = await signupService.decideSignup(
    req.params.id,
    req.body.decision,
    req.user._id
  );
  res.json({ success: true, data: { signup } });
});

const withdrawSignup = asyncHandler(async (req, res) => {
  const signup = await signupService.withdrawSignup(req.params.id, req.user._id);
  res.json({ success: true, data: { signup } });
});

const getMySignups = asyncHandler(async (req, res) => {
  const result = await signupService.getMySignups(req.user._id, req.query);
  const weeklyHours = await signupService.getMyWeeklyOtHours(req.user._id);
  res.json({ success: true, data: { ...result, weeklyOtHours: weeklyHours, cap: req.user.weeklyOtCapHours } });
});

module.exports = { createSignup, listSignupsForSlot, decideSignup, withdrawSignup, getMySignups };
