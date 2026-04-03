const asyncHandler = require('express-async-handler');

const roleMiddleware = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('No user attached to request');
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Forbidden: insufficient permission');
    }

    next();
  });
};

module.exports = roleMiddleware;
