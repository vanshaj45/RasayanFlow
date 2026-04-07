const express = require('express');
const { query, param, body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getUsers, approveUser, setUserBlockedState, createSuperAdmin } = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['superAdmin', 'labAdmin', 'storeAdmin']));

router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1 })], validateRequest, getUsers);
router.put('/approve/:userId', [param('userId').isMongoId()], validateRequest, approveUser);
router.put('/block/:userId', roleMiddleware(['superAdmin']), [param('userId').isMongoId(), body('isBlocked').isBoolean(), body('blockedReason').optional().isString()], validateRequest, setUserBlockedState);
router.post(
	'/super-admins',
	roleMiddleware(['superAdmin']),
	[
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('email').isEmail().withMessage('Valid email required'),
		body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
	],
	validateRequest,
	createSuperAdmin,
);

module.exports = router;
