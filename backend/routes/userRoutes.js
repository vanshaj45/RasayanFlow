const express = require('express');
const { query, param, body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getUsers, approveUser, setUserBlockedState } = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['superAdmin', 'labAdmin', 'storeAdmin']));

router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1 })], validateRequest, getUsers);
router.put('/approve/:userId', [param('userId').isMongoId()], validateRequest, approveUser);
router.put('/block/:userId', [param('userId').isMongoId(), body('isBlocked').isBoolean(), body('blockedReason').optional().isString()], validateRequest, setUserBlockedState);

module.exports = router;
