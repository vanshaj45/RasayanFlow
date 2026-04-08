const asyncHandler = require('express-async-handler');
const Experiment = require('../models/Experiment');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

const assertLabAdminAccess = (req, labId, res) => {
  if (req.user.role !== 'labAdmin') return;

  if (!req.user.labId || String(req.user.labId) !== String(labId)) {
    res.status(403);
    throw new Error('Forbidden: lab admins can only manage experiments in their assigned lab');
  }
};

const buildRequirements = async (labId, requiredInventory = [], res) => {
  if (!Array.isArray(requiredInventory) || requiredInventory.length === 0) {
    res.status(400);
    throw new Error('At least one required inventory item is needed for an experiment');
  }

  const requirements = await Promise.all(
    requiredInventory.map(async (entry) => {
      const inventoryItem = await Inventory.findById(entry.inventoryItemId);
      if (!inventoryItem || String(inventoryItem.labId) !== String(labId)) {
        res.status(400);
        throw new Error('A required inventory item is missing or belongs to a different lab');
      }

      const quantity = Number(entry.quantity || 0);
      if (quantity <= 0) {
        res.status(400);
        throw new Error('Required inventory quantities must be greater than zero');
      }

      const costPerUnit = Number(inventoryItem.costPerUnit || 0);
      return {
        inventoryItemId: inventoryItem._id,
        chemicalName: inventoryItem.chemicalName || inventoryItem.itemName,
        quantity,
        quantityUnit: entry.quantityUnit?.trim() || inventoryItem.quantityUnit,
        costPerUnit,
        estimatedCost: Number((quantity * costPerUnit).toFixed(2)),
      };
    })
  );

  return requirements;
};

const createExperiment = asyncHandler(async (req, res) => {
  const { labId, title, experimentObject, description, procedure, requiredInventory } = req.body;

  assertLabAdminAccess(req, labId, res);

  const duplicate = await Experiment.findOne({ labId, title: title.trim() });
  if (duplicate) {
    res.status(409);
    throw new Error('This experiment already exists in the selected lab');
  }

  const requirements = await buildRequirements(labId, requiredInventory, res);
  const totalEstimatedExpense = requirements.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);

  const experiment = await Experiment.create({
    labId,
    title: title.trim(),
    experimentObject: experimentObject.trim(),
    description: description?.trim() || '',
    procedure: procedure?.trim() || '',
    requiredInventory: requirements,
    totalEstimatedExpense,
    createdBy: req.user._id,
    updatedAt: new Date(),
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_experiment',
    details: `Created experiment ${experiment.title}`,
    entityType: 'experiment',
    entityId: experiment._id,
  });

  getIo().emit('experiment.updated', { action: 'created', experimentId: experiment._id });

  const populated = await Experiment.findById(experiment._id)
    .populate('labId', 'labName labCode')
    .populate('requiredInventory.inventoryItemId', 'itemName chemicalName quantity quantityUnit costPerUnit');

  res.status(201).json({ success: true, data: populated });
});

const getExperiments = asyncHandler(async (req, res) => {
  const { labId, search = '' } = req.query;
  const criteria = {};

  if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
  } else if (labId) {
    criteria.labId = labId;
  }

  if (search.trim()) {
    criteria.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { experimentObject: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { 'requiredInventory.chemicalName': { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const experiments = await Experiment.find(criteria)
    .populate('labId', 'labName labCode')
    .populate('requiredInventory.inventoryItemId', 'itemName chemicalName quantity quantityUnit costPerUnit')
    .sort({ updatedAt: -1, createdAt: -1 });

  res.json({ success: true, data: experiments });
});

const deleteExperiment = asyncHandler(async (req, res) => {
  const experiment = await Experiment.findById(req.params.id);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  assertLabAdminAccess(req, experiment.labId, res);

  await experiment.deleteOne();
  await ActivityLog.create({
    userId: req.user._id,
    action: 'delete_experiment',
    details: `Deleted experiment ${experiment.title}`,
    entityType: 'experiment',
    entityId: experiment._id,
  });
  getIo().emit('experiment.updated', { action: 'deleted', experimentId: experiment._id });

  res.json({ success: true, message: 'Experiment deleted' });
});

module.exports = {
  createExperiment,
  getExperiments,
  deleteExperiment,
};
