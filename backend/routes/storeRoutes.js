const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { listStoreItems, createStoreItem, updateStoreItem, deleteStoreItem, fetchChemicalAbstract } = require('../controllers/storeController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    query('category').optional().isString(),
    query('subCategory').optional().isString(),
    query('search').optional().isString(),
  ],
  validateRequest,
  listStoreItems,
);

router.post(
  '/',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [
    body('itemCode').notEmpty(),
    body('itemName').notEmpty(),
    body('category').notEmpty(),
    body('subCategory').notEmpty(),
    body('quantity').isInt({ min: 0 }),
    body('quantityUnit').optional().notEmpty(),
    body('storageLocation').optional().isString(),
    body('description').optional().isString(),
    body('abstract').optional().isString(),
    body('pubmedId').optional().isString(),
  ],
  validateRequest,
  createStoreItem,
);

router.post(
  '/fetch-abstract',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [
    body('chemicalName').notEmpty().isString(),
    body('storeItemId').optional().isMongoId(),
  ],
  validateRequest,
  fetchChemicalAbstract,
);

router.put(
  '/:id',
  roleMiddleware(['superAdmin', 'storeAdmin']),
  [
    param('id').isMongoId(),
    body('itemCode').optional().notEmpty(),
    body('itemName').optional().notEmpty(),
    body('category').optional().notEmpty(),
    body('subCategory').optional().notEmpty(),
    body('quantity').optional().isInt({ min: 0 }),
    body('quantityUnit').optional().notEmpty(),
    body('storageLocation').optional().isString(),
    body('description').optional().isString(),
    body('abstract').optional().isString(),
    body('pubmedId').optional().isString(),
  ],
  validateRequest,
  updateStoreItem,
);

router.delete('/:id', roleMiddleware(['superAdmin', 'storeAdmin']), [param('id').isMongoId()], validateRequest, deleteStoreItem);

module.exports = router;
