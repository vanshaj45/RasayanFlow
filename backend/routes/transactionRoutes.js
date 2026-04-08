const express = require('express');
const { body, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { borrowItem, requestExperiment, returnItem, approveBorrowRequest, rejectBorrowRequest, getTransactions } = require('../controllers/transactionController');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/borrow',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [
    body('itemId').isMongoId(),
    body('quantity').isInt({ min: 1 }),
    body('purpose').notEmpty(),
    body('neededUntil').isISO8601(),
    body('notes').optional().isString()
  ],
  validateRequest,
  borrowItem,
);

router.post(
  '/experiment-request',
  roleMiddleware(['student']),
  [
    body('experimentId').isMongoId(),
    body('purpose').optional().isString(),
    body('neededUntil').optional({ nullable: true }).isISO8601(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  requestExperiment,
);

router.post(
  '/return',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [body('itemId').isMongoId(), body('quantity').isInt({ min: 1 })],
  validateRequest,
  returnItem,
);

router.put(
  '/approve/:transactionId',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [body('reviewNotes').optional().isString()],
  validateRequest,
  approveBorrowRequest,
);

router.put(
  '/reject/:transactionId',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [body('reviewNotes').optional().isString()],
  validateRequest,
  rejectBorrowRequest,
);

router.get(
  '/',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1 }), query('itemCode').optional().isString()],
  validateRequest,
  getTransactions
);

module.exports = router;
