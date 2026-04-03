const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

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
  } = req.body;

  if (!labId || !itemCode || !itemName || !category || quantity == null || !quantityUnit || minThreshold == null) {
    res.status(400);
    throw new Error('Missing required fields');
  }

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
    lastUpdated: new Date()
  });

  await createAuditEntry({
    userId: req.user._id,
    action: 'create_item',
    details: `Created item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { after: buildInventorySnapshot(item) },
  });
  getIo().emit('inventoryUpdated', { action: 'created', item });

  res.status(201).json({ success: true, data: item });
});

const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

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
  getIo().emit('inventoryUpdated', { action: 'updated', item });

  res.json({ success: true, data: item });
});

const deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  const snapshot = buildInventorySnapshot(item);
  await item.deleteOne();

  await createAuditEntry({
    userId: req.user._id,
    action: 'delete_item',
    details: `Deleted item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before: snapshot },
  });
  getIo().emit('inventoryUpdated', { action: 'deleted', itemId: id });

  res.json({ success: true, message: 'Item deleted' });
});

const getInventory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, itemName = '', labId } = req.query;

  const criteria = {};
  if (labId) criteria.labId = labId;
  if (itemName) criteria.itemName = { $regex: itemName, $options: 'i' };

  const total = await Inventory.countDocuments(criteria);
  const items = await Inventory.find(criteria)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ lastUpdated: -1 });

  res.json({ success: true, data: items, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const getInventoryById = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  res.json({ success: true, data: item });
});

module.exports = { createInventory, updateInventory, deleteInventory, getInventory, getInventoryById };
