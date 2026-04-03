const express = require('express');
const { body, query, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { listStoreAllotments, createStoreAllotment, requestStoreItem, approveStoreRequest, rejectStoreRequest } = require('../controllers/storeAllotmentController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  [
    query('studentId').optional().isMongoId(),
    query('storeItemId').optional().isMongoId(),
  ],
  validateRequest,
  listStoreAllotments,
);

router.post(
  '/',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [
    body('storeItemId').isMongoId(),
    body('studentId').isMongoId(),
    body('quantity').isInt({ min: 1 }),
    body('purpose').optional().isString(),
    body('notes').optional().isString(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
  ],
  validateRequest,
  createStoreAllotment,
);

router.post(
  '/request',
  roleMiddleware(['student']),
  [
    body('storeItemId').isMongoId(),
    body('quantity').isInt({ min: 1 }),
    body('purpose').optional().isString(),
    body('requestNotes').optional().isString(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
  ],
  validateRequest,
  requestStoreItem,
);

router.put(
  '/approve/:id',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [param('id').isMongoId(), body('reviewNotes').optional().isString()],
  validateRequest,
  approveStoreRequest,
);

router.put(
  '/reject/:id',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [param('id').isMongoId(), body('reviewNotes').optional().isString()],
  validateRequest,
  rejectStoreRequest,
);

module.exports = router;
