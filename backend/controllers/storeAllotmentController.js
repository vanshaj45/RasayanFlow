const asyncHandler = require('express-async-handler');
const StoreAllotment = require('../models/StoreAllotment');
const StoreItem = require('../models/StoreItem');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

const listStoreAllotments = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.query.studentId) {
    filter.studentId = req.query.studentId;
  }

  if (req.query.storeItemId) {
    filter.storeItemId = req.query.storeItemId;
  }

  const allotments = await StoreAllotment.find(filter)
    .populate('storeItemId', 'itemName itemCode category subCategory quantityUnit')
    .populate('studentId', 'name email')
    .populate('allottedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .sort({ timestamp: -1 });

  res.json({ success: true, data: allotments });
});

const createStoreAllotment = asyncHandler(async (req, res) => {
  const { storeItemId, studentId, quantity, purpose, notes, dueDate } = req.body;

  const storeItem = await StoreItem.findById(storeItemId);
  if (!storeItem) {
    res.status(404);
    throw new Error('Store item not found');
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.isBlocked) {
    res.status(403);
    throw new Error('This student is blocked and cannot receive store items.');
  }

  if (storeItem.quantity < quantity) {
    res.status(400);
    throw new Error('Not enough store quantity available');
  }

  storeItem.quantity -= Number(quantity);
  storeItem.lastUpdated = new Date();
  await storeItem.save();

  const allotment = await StoreAllotment.create({
    storeItemId: storeItem._id,
    studentId: student._id,
    allottedBy: req.user._id,
    quantity,
    quantityUnit: storeItem.quantityUnit,
    status: 'approved',
    purpose: purpose?.trim() || '',
    notes: notes?.trim() || '',
    dueDate: dueDate || null,
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'allot_store_item',
    details: `Allotted ${quantity} ${storeItem.quantityUnit} of ${storeItem.itemName} to ${student.email}`,
    entityType: 'storeAllotment',
    entityId: allotment._id,
    metadata: {
      storeItemId: storeItem._id,
      studentId: student._id,
      quantity,
      quantityUnit: storeItem.quantityUnit,
      dueDate: dueDate || null,
    },
  });

  const populatedAllotment = await StoreAllotment.findById(allotment._id)
    .populate('storeItemId', 'itemName itemCode category subCategory quantityUnit')
    .populate('studentId', 'name email')
    .populate('allottedBy', 'name email')
    .populate('reviewedBy', 'name email');

  res.status(201).json({ success: true, data: populatedAllotment });
});

const requestStoreItem = asyncHandler(async (req, res) => {
  const { storeItemId, quantity, purpose, requestNotes, dueDate } = req.body;

  if (req.user.isBlocked) {
    res.status(403);
    throw new Error('Your account is blocked from making requests.');
  }

  const storeItem = await StoreItem.findById(storeItemId);
  if (!storeItem) {
    res.status(404);
    throw new Error('Store item not found');
  }

  const allotment = await StoreAllotment.create({
    storeItemId: storeItem._id,
    studentId: req.user._id,
    allottedBy: req.user._id,
    quantity,
    quantityUnit: storeItem.quantityUnit,
    status: 'pending',
    purpose: purpose?.trim() || '',
    requestNotes: requestNotes?.trim() || '',
    dueDate: dueDate || null,
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'request_store_item',
    details: `Requested ${quantity} ${storeItem.quantityUnit} of ${storeItem.itemName}`,
    entityType: 'storeAllotment',
    entityId: allotment._id,
    metadata: {
      storeItemId: storeItem._id,
      quantity,
      dueDate: dueDate || null,
    },
  });

  const populatedAllotment = await StoreAllotment.findById(allotment._id)
    .populate('storeItemId', 'itemName itemCode category subCategory quantityUnit')
    .populate('studentId', 'name email')
    .populate('allottedBy', 'name email')
    .populate('reviewedBy', 'name email');

  // Emit socket event for new request
  const io = getIo();
  io.emit('store:new_request', {
    allotmentId: populatedAllotment.id,
    studentId: populatedAllotment.studentId._id,
    studentName: populatedAllotment.studentId.name,
    itemName: populatedAllotment.storeItemId.itemName,
    itemCode: populatedAllotment.storeItemId.itemCode,
    quantity: populatedAllotment.quantity,
    quantityUnit: populatedAllotment.quantityUnit,
    purpose: populatedAllotment.purpose,
    requestNotes: populatedAllotment.requestNotes,
    dueDate: populatedAllotment.dueDate,
    timestamp: populatedAllotment.timestamp,
  });

  res.status(201).json({ success: true, data: populatedAllotment });
});

const approveStoreRequest = asyncHandler(async (req, res) => {
  const allotment = await StoreAllotment.findById(req.params.id).populate('storeItemId studentId');
  if (!allotment) {
    res.status(404);
    throw new Error('Store request not found');
  }

  if (allotment.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending store requests can be approved');
  }

  const storeItem = await StoreItem.findById(allotment.storeItemId._id || allotment.storeItemId);
  if (!storeItem) {
    res.status(404);
    throw new Error('Store item not found');
  }

  if (storeItem.quantity < allotment.quantity) {
    res.status(400);
    throw new Error('Not enough store quantity available');
  }

  storeItem.quantity -= allotment.quantity;
  storeItem.lastUpdated = new Date();
  await storeItem.save();

  allotment.status = 'approved';
  allotment.allottedBy = req.user._id;
  allotment.reviewedBy = req.user._id;
  allotment.reviewedAt = new Date();
  allotment.reviewNotes = req.body.reviewNotes?.trim() || '';
  await allotment.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: 'approve_store_request',
    details: `Approved store request for ${storeItem.itemName} by ${allotment.studentId.email}`,
    entityType: 'storeAllotment',
    entityId: allotment._id,
  });

  const populatedAllotment = await StoreAllotment.findById(allotment._id)
    .populate('storeItemId', 'itemName itemCode category subCategory quantityUnit')
    .populate('studentId', 'name email')
    .populate('allottedBy', 'name email')
    .populate('reviewedBy', 'name email');

  const io = getIo();
  io.emit('store:request_approved', {
    allotmentId: populatedAllotment.id,
    studentId: populatedAllotment.studentId._id,
    itemName: populatedAllotment.storeItemId.itemName,
    studentName: populatedAllotment.studentId.name,
    approvedBy: req.user.name,
  });

  res.json({ success: true, data: populatedAllotment });
});

const rejectStoreRequest = asyncHandler(async (req, res) => {
  const allotment = await StoreAllotment.findById(req.params.id).populate('storeItemId studentId');
  if (!allotment) {
    res.status(404);
    throw new Error('Store request not found');
  }

  if (allotment.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending store requests can be rejected');
  }

  allotment.status = 'rejected';
  allotment.reviewedBy = req.user._id;
  allotment.reviewedAt = new Date();
  allotment.reviewNotes = req.body.reviewNotes?.trim() || '';
  await allotment.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: 'reject_store_request',
    details: `Rejected store request for ${allotment.storeItemId.itemName} by ${allotment.studentId.email}`,
    entityType: 'storeAllotment',
    entityId: allotment._id,
  });

  const populatedAllotment = await StoreAllotment.findById(allotment._id)
    .populate('storeItemId', 'itemName itemCode category subCategory quantityUnit')
    .populate('studentId', 'name email')
    .populate('allottedBy', 'name email')
    .populate('reviewedBy', 'name email');

  const io = getIo();
  io.emit('store:request_rejected', {
    allotmentId: populatedAllotment.id,
    studentId: populatedAllotment.studentId._id,
    itemName: populatedAllotment.storeItemId.itemName,
    studentName: populatedAllotment.studentId.name,
    rejectedBy: req.user.name,
    reason: allotment.reviewNotes || 'No reason provided',
  });

  res.json({ success: true, data: populatedAllotment });
});

module.exports = { listStoreAllotments, createStoreAllotment, requestStoreItem, approveStoreRequest, rejectStoreRequest };
