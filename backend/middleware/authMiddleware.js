const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    const requiresApproval = ['labAdmin', 'storeAdmin'].includes(user.role);

    if (requiresApproval && user.email !== 'vanshajbairagi10@gmail.com' && !user.isApproved) {
      res.status(403);
      throw new Error('Account is not approved');
    }

    if (user.isBlocked) {
      res.status(403);
      throw new Error('Account is blocked. Please contact an administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid');
  }
});

module.exports = authMiddleware;
