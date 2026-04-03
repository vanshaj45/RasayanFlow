const asyncHandler = require('express-async-handler');
const ActivityLog = require('../models/ActivityLog');

const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, action } = req.query;
  const filter = {};

  if (userId) filter.userId = userId;
  if (action) filter.action = action;

  const total = await ActivityLog.countDocuments(filter);
  const logs = await ActivityLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ timestamp: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: logs, pagination: { total, page: Number(page), limit: Number(limit) } });
});

module.exports = { getLogs };
