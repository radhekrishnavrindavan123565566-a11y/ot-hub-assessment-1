const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user._id);
  res.status(201).json({ success: true, data: { user } });
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.query, req.user);
  res.json({ success: true, data: result });
});

const updateOtCap = asyncHandler(async (req, res) => {
  const user = await userService.updateOtCap(
    req.params.id,
    req.body.weeklyOtCapHours,
    req.user._id
  );
  res.json({ success: true, data: { user } });
});

module.exports = { createUser, listUsers, updateOtCap };
