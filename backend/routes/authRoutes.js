const express = require('express');
const { body } = require('express-validator');
const { register, login, me, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validateRequest,
  register,
);

router.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password required')],
  validateRequest,
  login,
);

router.get('/me', authMiddleware, me);

router.put(
  '/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validateRequest,
  changePassword,
);

module.exports = router;
