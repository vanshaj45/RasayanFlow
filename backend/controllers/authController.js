const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

  const isSuperAdmin = email.toLowerCase() === 'vanshajbairagi10@gmail.com';

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
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      labId: user.labId,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
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

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Account is blocked. Please contact an administrator.');
  }

  const requiresApproval = ['labAdmin', 'storeAdmin'].includes(user.role);

  if (requiresApproval && user.email.toLowerCase() !== 'vanshajbairagi10@gmail.com' && !user.isApproved) {
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
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      labId: user.labId,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
      token: generateToken(user._id),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      labId: user.labId,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
    },
  });
});

module.exports = { register, login, me };
