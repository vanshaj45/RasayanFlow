const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const getUsers = asyncHandler(async (req, res) => {
  const { role, labId, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (labId) filter.labId = labId;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: users, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const approveUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isApproved = true;
  await user.save();

  await ActivityLog.create({ userId: req.user._id, action: 'approve_user', details: `Approved ${user.email}` });

  res.json({ success: true, data: user });
});

const setUserBlockedState = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isBlocked, blockedReason = '' } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'student') {
    res.status(400);
    throw new Error('Only student accounts can be blocked or unblocked');
  }

  user.isBlocked = Boolean(isBlocked);
  user.blockedReason = user.isBlocked ? blockedReason.trim() : '';
  user.blockedBy = user.isBlocked ? req.user._id : null;
  await user.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: user.isBlocked ? 'block_user' : 'unblock_user',
    details: `${user.isBlocked ? 'Blocked' : 'Unblocked'} ${user.email}`,
    entityType: 'user',
    entityId: user._id,
    metadata: { blockedReason: user.blockedReason },
  });

  res.json({ success: true, data: user });
});

module.exports = { getUsers, approveUser, setUserBlockedState };
