const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getEligibleStudents, getTeams, createTeam, updateTeam, getTeamAllotments } = require('../controllers/teamController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/eligible-members',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  validateRequest,
  getEligibleStudents
);

router.get(
  '/allotments',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [query('labId').optional().isMongoId(), query('teamId').optional().isMongoId()],
  validateRequest,
  getTeamAllotments
);

router.get(
  '/',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [query('labId').optional().isMongoId()],
  validateRequest,
  getTeams
);

router.post(
  '/',
  roleMiddleware(['student']),
  [
    body('name').trim().notEmpty(),
    body('labId').isMongoId(),
    body('memberIds').optional().isArray(),
    body('memberIds.*').optional().isMongoId(),
  ],
  validateRequest,
  createTeam
);

router.put(
  '/:teamId',
  roleMiddleware(['superAdmin', 'labAdmin', 'student']),
  [
    param('teamId').isMongoId(),
    body('name').optional().isString(),
    body('memberIds').optional().isArray(),
    body('memberIds.*').optional().isMongoId(),
    body('status').optional().isIn(['active', 'archived']),
  ],
  validateRequest,
  updateTeam
);

module.exports = router;
