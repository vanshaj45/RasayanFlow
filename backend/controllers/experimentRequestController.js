const asyncHandler = require('express-async-handler');
const Experiment = require('../models/Experiment');
const ExperimentRequest = require('../models/ExperimentRequest');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

const createExperimentRequest = asyncHandler(async (req, res) => {
  const { experimentId, purpose, preferredDate, notes } = req.body;

  const experiment = await Experiment.findById(experimentId);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  const request = await ExperimentRequest.create({
    experimentId: experiment._id,
    labId: experiment.labId,
    studentId: req.user._id,
    purpose: purpose?.trim() || '',
    preferredDate: preferredDate || null,
    notes: notes?.trim() || '',
    requesterName: req.user.name || '',
    requesterEmail: req.user.email || '',
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'experiment_request',
    details: `Requested experiment ${experiment.title}`,
    entityType: 'experimentRequest',
    entityId: request._id,
  });

  getIo().emit('experiment.requested', { requestId: request._id, experimentId: experiment._id });

  const populated = await ExperimentRequest.findById(request._id)
    .populate('experimentId')
    .populate('studentId', 'name email');

  res.status(201).json({ success: true, data: populated });
});

const getExperimentRequests = asyncHandler(async (req, res) => {
  const { labId, status } = req.query;
  const criteria = {};

  if (req.user.role === 'student') {
    criteria.studentId = req.user._id;
  } else if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
  } else if (labId) {
    criteria.labId = labId;
  }

  if (status) criteria.status = status;

  const requests = await ExperimentRequest.find(criteria)
    .populate({
      path: 'experimentId',
      populate: {
        path: 'requiredInventory.inventoryItemId',
        select: 'itemName chemicalName quantity quantityUnit costPerUnit',
      },
    })
    .populate('studentId', 'name email')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

const updateExperimentRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status, reviewNotes } = req.body;

  const request = await ExperimentRequest.findById(requestId).populate('experimentId');
  if (!request) {
    res.status(404);
    throw new Error('Experiment request not found');
  }

  if (req.user.role === 'labAdmin' && String(req.user.labId) !== String(request.labId)) {
    res.status(403);
    throw new Error('Forbidden: lab admins can only review requests for their assigned lab');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending experiment requests can be reviewed');
  }

  request.status = status;
  request.reviewNotes = reviewNotes?.trim() || '';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: status === 'approved' ? 'approve_experiment_request' : 'reject_experiment_request',
    details: `${status === 'approved' ? 'Approved' : 'Rejected'} experiment request for ${request.experimentId?.title || 'experiment'}`,
    entityType: 'experimentRequest',
    entityId: request._id,
  });

  getIo().emit(`experiment.request_${status}`, { requestId: request._id, experimentId: request.experimentId?._id });

  const populated = await ExperimentRequest.findById(request._id)
    .populate('experimentId')
    .populate('studentId', 'name email')
    .populate('reviewedBy', 'name email');

  res.json({ success: true, data: populated });
});

module.exports = {
  createExperimentRequest,
  getExperimentRequests,
  updateExperimentRequestStatus,
};
