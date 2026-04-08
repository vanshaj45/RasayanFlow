const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

const ensureConfiguredSuperAdmin = async (user) => {
  const isConfiguredSuperAdmin =
    Boolean(SUPER_ADMIN_EMAIL) && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;

  if (!isConfiguredSuperAdmin) {
    return user;
  }

  let shouldSave = false;

  if (user.role !== 'superAdmin') {
    user.role = 'superAdmin';
    shouldSave = true;
  }

  if (!user.isApproved) {
    user.isApproved = true;
    shouldSave = true;
  }

  if (user.labId) {
    user.labId = null;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, token missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token invalid');
  }

  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  await ensureConfiguredSuperAdmin(user);

  const requiresApproval = ['labAdmin', 'storeAdmin'].includes(user.role);

  if (requiresApproval && (!SUPER_ADMIN_EMAIL || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) && !user.isApproved) {
    res.status(403);
    throw new Error('Account is not approved');
  }

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Account is blocked. Please contact an administrator.');
  }

  req.user = user;
  next();
});

module.exports = authMiddleware;
