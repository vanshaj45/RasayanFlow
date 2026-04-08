const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  labId: user.labId,
  isApproved: user.isApproved,
  isBlocked: user.isBlocked,
});

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

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, labId } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const isSuperAdmin = Boolean(SUPER_ADMIN_EMAIL) && email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const user = await User.create({
    name,
    email,
    password,
    role: isSuperAdmin ? 'superAdmin' : role || 'student',
    labId: labId || null,
    isApproved: isSuperAdmin || (role || 'student') === 'student',
  });

  await ActivityLog.create({
    userId: user._id,
    action: 'register',
    details: `Registration for ${user.email}`,
  });

  res.status(201).json({
    success: true,
    data: {
      ...serializeUser(user),
      token: generateToken(user._id),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  await ensureConfiguredSuperAdmin(user);

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Account is blocked. Please contact an administrator.');
  }

  const requiresApproval = ['labAdmin', 'storeAdmin'].includes(user.role);

  if (requiresApproval && (!SUPER_ADMIN_EMAIL || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) && !user.isApproved) {
    res.status(403);
    throw new Error('Account not approved yet');
  }

  await ActivityLog.create({
    userId: user._id,
    action: 'login',
    details: `Login for ${user.email}`,
  });

  res.json({
    success: true,
    data: {
      ...serializeUser(user),
      token: generateToken(user._id),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: serializeUser(user),
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const passwordMatches = await user.comparePassword(currentPassword);
  if (!passwordMatches) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  await ActivityLog.create({
    userId: user._id,
    action: 'change_password',
    details: `Password changed for ${user.email}`,
  });

  res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = { register, login, me, changePassword };
