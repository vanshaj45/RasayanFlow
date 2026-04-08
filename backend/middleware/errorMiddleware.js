const logger = require('../utils/logger');

const redactSensitiveFields = (value) => {
  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  return Object.entries(value).reduce((acc, [key, current]) => {
    if (['password', 'currentPassword', 'newPassword', 'token', 'authorization'].includes(key)) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = redactSensitiveFields(current);
    }
    return acc;
  }, {});
};

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: redactSensitiveFields(req.body),
  });

  const status = (res.statusCode && res.statusCode !== 200 ? res.statusCode : null) || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
