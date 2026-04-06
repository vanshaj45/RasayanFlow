const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');
const { getChemicalAbstract } = require('../utils/pubmedService');
const { decorateInventoryAbstract } = require('../utils/abstractFallbackService');

const assertLabAdminAccess = (req, res, ownerLabId) => {
  if (req.user.role !== 'labAdmin') return;

  if (!req.user.labId || String(ownerLabId) !== String(req.user.labId)) {
    res.status(403);
    throw new Error('Forbidden: lab admins can only access inventory in their assigned lab');
  }
};

const buildInventorySnapshot = (item) => ({
  itemCode: item.itemCode,
  itemName: item.itemName,
  category: item.category,
  quantity: item.quantity,
  quantityUnit: item.quantityUnit,
  minThreshold: item.minThreshold,
  storageLocation: item.storageLocation || '',
  lotNumber: item.lotNumber || '',
  expiryDate: item.expiryDate || null,
  abstract: item.abstract || '',
  pubmedId: item.pubmedId || '',
  labId: item.labId,
});

const createAuditEntry = ({ userId, action, details, entityType = 'inventory', entityId = null, metadata = null }) =>
  ActivityLog.create({
    userId,
    action,
    details,
    entityType,
    entityId,
    metadata,
  });

const createInventory = asyncHandler(async (req, res) => {
  const {
    labId,
    itemCode,
    itemName,
    category,
    quantity,
    quantityUnit,
    minThreshold,
    storageLocation,
    lotNumber,
    expiryDate,
    abstract,
    pubmedId,
  } = req.body;

  if (!labId || !itemCode || !itemName || !category || quantity == null || !quantityUnit || minThreshold == null) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  assertLabAdminAccess(req, res, labId);

  const normalizedCode = itemCode.trim().toUpperCase();
  const existingItem = await Inventory.findOne({ labId, itemCode: normalizedCode });
  if (existingItem) {
    res.status(409);
    throw new Error('This item is already listed.');
  }

  const item = await Inventory.create({
    labId,
    itemCode: normalizedCode,
    itemName: itemName.trim(),
    category: category.trim(),
    quantity,
    quantityUnit: quantityUnit.trim(),
    minThreshold,
    storageLocation: storageLocation?.trim() || '',
    lotNumber: lotNumber?.trim() || '',
    expiryDate: expiryDate || null,
    abstract: abstract?.trim() || '',
    pubmedId: pubmedId?.trim() || '',
    lastUpdated: new Date()
  });

  await createAuditEntry({
    userId: req.user._id,
    action: 'create_item',
    details: `Created item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { after: buildInventorySnapshot(item) },
  });
  getIo().emit('inventory.updated', { action: 'created', item });

  res.status(201).json({ success: true, data: decorateInventoryAbstract(item) });
});

const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  if (updates.quantity != null && updates.quantity < 0) {
    res.status(400);
    throw new Error('Quantity cannot be negative');
  }

  const before = buildInventorySnapshot(item);

  if (updates.itemCode != null) {
    updates.itemCode = String(updates.itemCode).trim().toUpperCase();
    const duplicateItem = await Inventory.findOne({
      _id: { $ne: id },
      labId: item.labId,
      itemCode: updates.itemCode,
    });

    if (duplicateItem) {
      res.status(409);
      throw new Error('This item is already listed.');
    }
  }

  if (updates.itemName != null) updates.itemName = String(updates.itemName).trim();
  if (updates.category != null) updates.category = String(updates.category).trim();
  if (updates.quantityUnit != null) updates.quantityUnit = String(updates.quantityUnit).trim();
  if (updates.storageLocation != null) updates.storageLocation = String(updates.storageLocation).trim();
  if (updates.lotNumber != null) updates.lotNumber = String(updates.lotNumber).trim();
  if (updates.abstract != null) updates.abstract = String(updates.abstract).trim();
  if (updates.pubmedId != null) updates.pubmedId = String(updates.pubmedId).trim();
  if (Object.prototype.hasOwnProperty.call(updates, 'expiryDate') && !updates.expiryDate) {
    updates.expiryDate = null;
  }

  Object.assign(item, updates);
  item.lastUpdated = new Date();
  await item.save();

  await createAuditEntry({
    userId: req.user._id,
    action: 'update_item',
    details: `Updated item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before, after: buildInventorySnapshot(item) },
  });
  getIo().emit('inventory.updated', { action: 'updated', item });

  res.json({ success: true, data: decorateInventoryAbstract(item) });
});

const deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  const snapshot = buildInventorySnapshot(item);
  await item.deleteOne();

  await createAuditEntry({
    userId: req.user._id,
    action: 'delete_item',
    details: `Deleted item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before: snapshot },
  });
  getIo().emit('inventory.updated', { action: 'deleted', itemId: id });

  res.json({ success: true, message: 'Item deleted' });
});

const getInventory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, itemName = '', labId } = req.query;

  const criteria = {};
  if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
    if (labId && String(labId) !== String(req.user.labId)) {
      res.status(403);
      throw new Error('Forbidden: lab admins can only query inventory for their assigned lab');
    }
  } else if (labId) {
    criteria.labId = labId;
  }
  if (itemName) criteria.itemName = { $regex: itemName, $options: 'i' };

  const total = await Inventory.countDocuments(criteria);
  const items = await Inventory.find(criteria)
    .populate('labId', 'labName labCode')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ lastUpdated: -1 });

  const decoratedItems = items.map((entry) => decorateInventoryAbstract(entry));
  res.json({ success: true, data: decoratedItems, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const getInventoryById = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  res.json({ success: true, data: decorateInventoryAbstract(item) });
});

const fetchChemicalAbstractForInventory = asyncHandler(async (req, res) => {
  const { chemicalName, inventoryItemId } = req.body;

  if (!chemicalName || chemicalName.trim().length === 0) {
    res.status(400);
    throw new Error('Chemical name is required');
  }

  try {
    const abstractData = await getChemicalAbstract(chemicalName.trim());

    // If inventoryItemId is provided, update the item with the fetched abstract
    if (inventoryItemId && abstractData.source === 'pubmed') {
      const item = await Inventory.findById(inventoryItemId);
      if (item) {
        assertLabAdminAccess(req, res, item.labId);
        item.abstract = abstractData.abstract;
        item.pubmedId = abstractData.pmid;
        item.lastUpdated = new Date();
        await item.save();

        await createAuditEntry({
          userId: req.user._id,
          action: 'update_abstract',
          details: `Updated abstract for ${item.itemName} from PubMed`,
          entityId: item._id,
          metadata: { pmid: abstractData.pmid, source: 'pubmed' },
        });

        getIo().emit('inventory.updated', { action: 'updated', item });
      }
    }

    res.json({
      success: true,
      data: abstractData,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Failed to fetch abstract: ${error.message}`);
  }
});

module.exports = { createInventory, updateInventory, deleteInventory, getInventory, getInventoryById, fetchChemicalAbstractForInventory };
