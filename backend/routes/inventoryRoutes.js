const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createInventory, updateInventory, deleteInventory, getInventory, getInventoryById, fetchChemicalAbstractForInventory } = require('../controllers/inventoryController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1 })],
  validateRequest,
  getInventory,
);

router.get('/:id', [param('id').isMongoId()], validateRequest, getInventoryById);

router.post(
  '/',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    body('labId').isMongoId(),
    body('itemCode').notEmpty(),
    body('itemName').notEmpty(),
    body('category').notEmpty(),
    body('quantity').isInt({ min: 0 }),
    body('quantityUnit').notEmpty(),
    body('minThreshold').isInt({ min: 0 }),
    body('storageLocation').optional().isString(),
    body('lotNumber').optional().isString(),
    body('expiryDate').optional({ nullable: true }).isISO8601(),
    body('abstract').optional().isString(),
    body('pubmedId').optional().isString()
  ],
  validateRequest,
  createInventory,
);

router.post(
  '/fetch-abstract',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    body('chemicalName').notEmpty().isString(),
    body('inventoryItemId').optional().isMongoId(),
  ],
  validateRequest,
  fetchChemicalAbstractForInventory,
);

router.put('/:id',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    param('id').isMongoId(),
    body('itemCode').optional().notEmpty(),
    body('itemName').optional().notEmpty(),
    body('category').optional().notEmpty(),
    body('quantity').optional().isInt({ min: 0 }),
    body('quantityUnit').optional().notEmpty(),
    body('minThreshold').optional().isInt({ min: 0 }),
    body('storageLocation').optional().isString(),
    body('lotNumber').optional().isString(),
    body('expiryDate').optional({ nullable: true }).isISO8601(),
    body('abstract').optional().isString(),
    body('pubmedId').optional().isString()
  ],
  validateRequest,
  updateInventory,
);

router.delete('/:id', roleMiddleware(['superAdmin', 'labAdmin']), [param('id').isMongoId()], validateRequest, deleteInventory);

module.exports = router;
