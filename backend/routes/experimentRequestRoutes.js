const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createExperimentRequest, getExperimentRequests, updateExperimentRequestStatus } = require('../controllers/experimentRequestController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [query('labId').optional().isMongoId(), query('status').optional().isIn(['pending', 'approved', 'rejected'])],
  validateRequest,
  getExperimentRequests
);

router.post(
  '/',
  roleMiddleware(['student']),
  [
    body('experimentId').isMongoId(),
    body('purpose').optional().isString(),
    body('preferredDate').optional({ nullable: true }).isISO8601(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  createExperimentRequest
);

router.put(
  '/:requestId/status',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    param('requestId').isMongoId(),
    body('status').isIn(['approved', 'rejected']),
    body('reviewNotes').optional().isString(),
  ],
  validateRequest,
  updateExperimentRequestStatus
);

module.exports = router;
