const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Experiment = require('../models/Experiment');
const Team = require('../models/Team');
const TeamAllotment = require('../models/TeamAllotment');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

const roundQuantity = (value) => Number(Number(value || 0).toFixed(4));

const getTeamParticipants = async (teamId, currentUserId, labId) => {
  if (!teamId) {
    return {
      team: null,
      participants: [String(currentUserId)],
      teamName: '',
      memberCount: 1,
    };
  }

  const team = await Team.findById(teamId);
  if (!team || team.status !== 'active') {
    throw new Error('Team not found');
  }

  if (String(team.labId) !== String(labId)) {
    throw new Error('Selected team does not belong to this lab');
  }

  if (String(team.leaderId) !== String(currentUserId)) {
    throw new Error('Only the team leader can request an experiment for this team');
  }

  const participants = Array.from(new Set([String(team.leaderId), ...team.memberIds.map((memberId) => String(memberId))]));
  if (!participants.length) {
    throw new Error('Team must have at least one member');
  }

  const approvedMembers = await User.find({
    _id: { $in: participants },
    role: 'student',
    isBlocked: false,
    isApproved: true,
  }).select('_id');

  if (approvedMembers.length !== participants.length) {
    throw new Error('All team members must be approved and active students');
  }

  return {
    team,
    participants,
    teamName: team.name,
    memberCount: participants.length,
  };
};

const getBorrowReturnBalance = async (userId, itemId) => {
  const [approvedBorrow, returned] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          userId,
          itemId,
          type: 'borrow',
          status: 'approved',
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId,
          itemId,
          type: 'return',
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
  ]);

  const borrowedQty = approvedBorrow[0]?.total || 0;
  const returnedQty = returned[0]?.total || 0;
  return borrowedQty - returnedQty;
};

const borrowItem = asyncHandler(async (req, res) => {
  const { itemId, quantity, purpose, neededUntil, notes } = req.body;
  if (!itemId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error('itemId and positive quantity required');
  }

  const item = await Inventory.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  const canAutoApprove = ['superAdmin', 'labAdmin'].includes(req.user.role);

  if (canAutoApprove && item.quantity < quantity) {
    res.status(400);
    throw new Error('Not enough inventory to borrow');
  }

  const transaction = await Transaction.create({
    userId: req.user._id,
    labId: item.labId,
    itemId: item._id,
    quantity,
    type: 'borrow',
    status: canAutoApprove ? 'approved' : 'pending',
    purpose: purpose || '',
    neededUntil: neededUntil || null,
    requesterName: req.user.name || '',
    requesterEmail: req.user.email || '',
    notes: notes || '',
  });

  if (canAutoApprove) {
    item.quantity -= quantity;
    item.lastUpdated = new Date();
    await item.save();

    await ActivityLog.create({ userId: req.user._id, action: 'borrow_item', details: `Borrowed ${quantity} of ${item.itemName}` });
    getIo().emit('itemBorrowed', { item, transaction });
    getIo().emit('inventory.updated', { action: 'borrow', item });

    if (item.quantity < item.minThreshold) {
      await ActivityLog.create({ userId: req.user._id, action: 'low_stock_alert', details: `${item.itemName} is below threshold` });
    }
  } else {
    await ActivityLog.create({ userId: req.user._id, action: 'borrow_request', details: `Requested ${quantity} of ${item.itemName}` });
    getIo().emit('borrowRequestCreated', { item, transaction });
  }

  res.status(201).json({ success: true, data: { transaction, item } });
});

const requestExperiment = asyncHandler(async (req, res) => {
  const { experimentId, teamId, purpose, neededUntil, notes } = req.body;

  const experiment = await Experiment.findById(experimentId);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  const { team, participants, teamName, memberCount } = await getTeamParticipants(teamId, req.user._id, experiment.labId);

  const transaction = await Transaction.create({
    userId: req.user._id,
    labId: experiment.labId,
    experimentId: experiment._id,
    teamId: team?._id || null,
    teamName,
    participantIds: participants,
    memberCount,
    requestCategory: 'experiment',
    experimentTitle: experiment.title,
    quantity: 1,
    type: 'borrow',
    status: 'pending',
    purpose: purpose || '',
    neededUntil: neededUntil || null,
    requesterName: req.user.name || '',
    requesterEmail: req.user.email || '',
    notes: notes || '',
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: team ? 'team_experiment_request' : 'experiment_request',
    details: team ? `Requested experiment ${experiment.title} for team ${team.name}` : `Requested experiment ${experiment.title}`,
  });
  getIo().emit('borrowRequestCreated', { transaction, experiment });

  res.status(201).json({ success: true, data: { transaction, experiment } });
});

const returnItem = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;

  if (!itemId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error('itemId and positive quantity required');
  }

  const item = await Inventory.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  if (req.user.role === 'student') {
    const availableToReturn = await getBorrowReturnBalance(req.user._id, item._id);
    if (availableToReturn < Number(quantity)) {
      res.status(400);
      throw new Error('Return denied: quantity exceeds your approved borrow balance for this item');
    }
  }

  item.quantity += quantity;
  item.lastUpdated = new Date();
  await item.save();

  const transaction = await Transaction.create({
    userId: req.user._id,
    labId: item.labId,
    itemId: item._id,
    quantity,
    type: 'return',
  });

  await ActivityLog.create({ userId: req.user._id, action: 'return_item', details: `Returned ${quantity} of ${item.itemName}` });
  getIo().emit('itemReturned', { item, transaction });
  getIo().emit('inventory.updated', { action: 'return', item });

  res.status(201).json({ success: true, data: { transaction, item } });
});

const approveBorrowRequest = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reviewNotes } = req.body;

  const transaction = await Transaction.findById(transactionId)
    .populate('itemId')
    .populate('experimentId');
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.type !== 'borrow' || transaction.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending borrow requests can be approved');
  }

  if (transaction.requestCategory === 'experiment') {
    const experiment = await Experiment.findById(transaction.experimentId?._id || transaction.experimentId).populate('requiredInventory.inventoryItemId');
    if (!experiment) {
      res.status(404);
      throw new Error('Experiment not found');
    }

    const participantIds = transaction.participantIds?.length
      ? transaction.participantIds.map((participantId) => String(participantId))
      : [String(transaction.userId)];
    const memberCount = participantIds.length || 1;

    for (const requirement of experiment.requiredInventory) {
      const inventoryItemId = requirement.inventoryItemId?._id || requirement.inventoryItemId;
      const inventoryItem = await Inventory.findById(inventoryItemId);
      if (!inventoryItem) {
        res.status(404);
        throw new Error(`Inventory item for ${requirement.chemicalName} not found`);
      }

      if (inventoryItem.quantity < requirement.quantity) {
        res.status(400);
        throw new Error(`Not enough inventory to approve ${requirement.chemicalName}`);
      }
    }

    const allotments = [];
    for (const requirement of experiment.requiredInventory) {
      const inventoryItemId = requirement.inventoryItemId?._id || requirement.inventoryItemId;
      const inventoryItem = await Inventory.findById(inventoryItemId);

      inventoryItem.quantity -= requirement.quantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save();

      const totalQuantity = Number(requirement.quantity || 0);
      const perMemberQuantity = roundQuantity(totalQuantity / memberCount);
      const allocatedTotal = roundQuantity(perMemberQuantity * memberCount);
      const remainder = roundQuantity(totalQuantity - allocatedTotal);

      const allocations = participantIds.map((participantId, index) => ({
        userId: participantId,
        quantity: roundQuantity(perMemberQuantity + (index === 0 ? remainder : 0)),
      }));

      const allotment = await TeamAllotment.create({
        requestTransactionId: transaction._id,
        experimentId: experiment._id,
        teamId: transaction.teamId || null,
        teamName: transaction.teamName || '',
        labId: transaction.labId,
        inventoryItemId,
        chemicalName: requirement.chemicalName,
        totalQuantity,
        quantityUnit: requirement.quantityUnit,
        memberCount,
        perMemberQuantity,
        allocations,
        allocatedBy: req.user._id,
      });
      allotments.push(allotment);
      getIo().emit('inventory.updated', { action: 'borrow', item: inventoryItem });
    }

    transaction.status = 'approved';
    transaction.reviewedBy = req.user._id;
    transaction.reviewedAt = new Date();
    transaction.reviewNotes = reviewNotes || '';
    await transaction.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'approve_experiment_request',
      details: transaction.teamName
        ? `Approved experiment request for ${transaction.experimentTitle || 'experiment'} and split chemicals across ${transaction.memberCount || memberCount} team members`
        : `Approved experiment request for ${transaction.experimentTitle || 'experiment'}`,
    });
    getIo().emit('borrowRequestApproved', { transaction, allotments });

    return res.json({ success: true, data: { transaction, allotments } });
  }

  const item = await Inventory.findById(transaction.itemId._id || transaction.itemId);
  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  if (item.quantity < transaction.quantity) {
    res.status(400);
    throw new Error('Not enough inventory to approve this request');
  }

  item.quantity -= transaction.quantity;
  item.lastUpdated = new Date();
  await item.save();

  transaction.status = 'approved';
  transaction.reviewedBy = req.user._id;
  transaction.reviewedAt = new Date();
  transaction.reviewNotes = reviewNotes || '';
  await transaction.save();

  await ActivityLog.create({ userId: req.user._id, action: 'approve_borrow_request', details: `Approved borrow request for ${item.itemName}` });
  getIo().emit('borrowRequestApproved', { item, transaction });
  getIo().emit('inventory.updated', { action: 'borrow', item });

  res.json({ success: true, data: { transaction, item } });
});

const rejectBorrowRequest = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reviewNotes } = req.body;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.type !== 'borrow' || transaction.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending borrow requests can be rejected');
  }

  transaction.status = 'rejected';
  transaction.reviewedBy = req.user._id;
  transaction.reviewedAt = new Date();
  transaction.reviewNotes = reviewNotes || '';
  await transaction.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: transaction.requestCategory === 'experiment' ? 'reject_experiment_request' : 'reject_borrow_request',
    details: transaction.requestCategory === 'experiment' ? `Rejected experiment request ${transaction.experimentTitle || transaction._id}` : `Rejected borrow request ${transaction._id}`,
  });
  getIo().emit('borrowRequestRejected', { transaction });

  res.json({ success: true, data: transaction });
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, labId, userId, status, itemCode = '' } = req.query;
  const criteria = {};

  if (req.user.role === 'student') {
    criteria.$or = [{ userId: req.user._id }, { participantIds: req.user._id }];
  } else {
    if (labId) criteria.labId = labId;
    if (userId) criteria.userId = userId;
  }
  if (status) criteria.status = status;
  if (itemCode) {
    const matchingItems = await Inventory.find({
      ...(labId ? { labId } : {}),
      itemCode: itemCode.trim().toUpperCase()
    }).select('_id');

    criteria.itemId = matchingItems.length ? { $in: matchingItems.map((item) => item._id) } : null;
  }

  const total = await Transaction.countDocuments(criteria);
  const records = await Transaction.find(criteria)
    .populate('userId', 'name email')
    .populate('participantIds', 'name email')
    .populate('itemId', 'itemName itemCode quantity quantityUnit category')
    .populate('experimentId', 'title experimentObject totalEstimatedExpense')
    .populate('teamId', 'name leaderId memberIds')
    .populate('reviewedBy', 'name email')
    .sort({ timestamp: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: records, pagination: { total, page: Number(page), limit: Number(limit) } });
});

module.exports = { borrowItem, requestExperiment, returnItem, approveBorrowRequest, rejectBorrowRequest, getTransactions };
