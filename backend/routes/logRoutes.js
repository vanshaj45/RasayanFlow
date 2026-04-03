const express = require('express');
const { query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getLogs } = require('../controllers/logController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['superAdmin']));

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
], validateRequest, getLogs);

module.exports = router;
