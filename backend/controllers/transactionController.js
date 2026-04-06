const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

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
    if (item.quantity < quantity) {
      res.status(400);
      throw new Error('Not enough inventory to borrow');
    }

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

  const transaction = await Transaction.findById(transactionId).populate('itemId');
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.type !== 'borrow' || transaction.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending borrow requests can be approved');
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

  await ActivityLog.create({ userId: req.user._id, action: 'reject_borrow_request', details: `Rejected borrow request ${transaction._id}` });
  getIo().emit('borrowRequestRejected', { transaction });

  res.json({ success: true, data: transaction });
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, labId, userId, status, itemCode = '' } = req.query;
  const criteria = {};

  if (req.user.role === 'student') {
    criteria.userId = req.user._id;
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
    .populate('itemId', 'itemName itemCode quantity quantityUnit category')
    .populate('reviewedBy', 'name email')
    .sort({ timestamp: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: records, pagination: { total, page: Number(page), limit: Number(limit) } });
});

module.exports = { borrowItem, returnItem, approveBorrowRequest, rejectBorrowRequest, getTransactions };
