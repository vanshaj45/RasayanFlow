const asyncHandler = require('express-async-handler');
const Team = require('../models/Team');
const TeamAllotment = require('../models/TeamAllotment');
const Lab = require('../models/Lab');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const serializeTeam = async (teamId) =>
  Team.findById(teamId)
    .populate('labId', 'labName labCode')
    .populate('leaderId', 'name email')
    .populate('memberIds', 'name email');

const buildParticipantIds = (leaderId, memberIds = []) =>
  Array.from(new Set([String(leaderId), ...memberIds.map((memberId) => String(memberId))]));

const validateMembers = async (participantIds) => {
  const users = await User.find({
    _id: { $in: participantIds },
    role: 'student',
    isApproved: true,
    isBlocked: false,
  }).select('_id name email');

  if (users.length !== participantIds.length) {
    throw new Error('All selected team members must be approved, active students');
  }

  return users;
};

const getEligibleStudents = asyncHandler(async (req, res) => {
  const students = await User.find({
    role: 'student',
    isApproved: true,
    isBlocked: false,
  })
    .select('name email')
    .sort({ name: 1 });

  res.json({ success: true, data: students });
});

const getTeams = asyncHandler(async (req, res) => {
  const { labId } = req.query;
  const criteria = { status: 'active' };

  if (labId) criteria.labId = labId;

  if (req.user.role === 'student') {
    criteria.$or = [{ leaderId: req.user._id }, { memberIds: req.user._id }];
  } else if (req.user.role === 'labAdmin') {
    if (labId && String(req.user.labId) !== String(labId)) {
      res.status(403);
      throw new Error('Forbidden: lab admins can only access teams for their assigned lab');
    }
    criteria.labId = req.user.labId;
  }

  const teams = await Team.find(criteria)
    .populate('labId', 'labName labCode')
    .populate('leaderId', 'name email')
    .populate('memberIds', 'name email')
    .sort({ updatedAt: -1 });

  res.json({ success: true, data: teams });
});

const createTeam = asyncHandler(async (req, res) => {
  const { name, labId, memberIds = [] } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  const participantIds = buildParticipantIds(req.user._id, memberIds);
  await validateMembers(participantIds);

  const team = await Team.create({
    name: name.trim(),
    labId,
    leaderId: req.user._id,
    memberIds: participantIds.filter((participantId) => String(participantId) !== String(req.user._id)),
    createdBy: req.user._id,
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_team',
    details: `Created team ${team.name}`,
    entityType: 'team',
    entityId: team._id,
  });

  const populated = await serializeTeam(team._id);
  res.status(201).json({ success: true, data: populated });
});

const updateTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { name, memberIds = [], status } = req.body;

  const team = await Team.findById(teamId);
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  if (req.user.role === 'student' && String(team.leaderId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the team leader can update this team');
  }

  const participantIds = buildParticipantIds(team.leaderId, memberIds);
  await validateMembers(participantIds);

  if (name != null) team.name = String(name).trim();
  team.memberIds = participantIds.filter((participantId) => String(participantId) !== String(team.leaderId));
  if (status && ['active', 'archived'].includes(status)) team.status = status;
  team.updatedAt = new Date();
  await team.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: 'update_team',
    details: `Updated team ${team.name}`,
    entityType: 'team',
    entityId: team._id,
  });

  const populated = await serializeTeam(team._id);
  res.json({ success: true, data: populated });
});

const getTeamAllotments = asyncHandler(async (req, res) => {
  const { labId, teamId } = req.query;
  const criteria = {};

  if (labId) criteria.labId = labId;
  if (teamId) criteria.teamId = teamId;

  if (req.user.role === 'student') {
    criteria['allocations.userId'] = req.user._id;
  } else if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
  }

  const allotments = await TeamAllotment.find(criteria)
    .populate('inventoryItemId', 'itemName chemicalName quantity quantityUnit')
    .populate('experimentId', 'title')
    .populate('teamId', 'name leaderId')
    .populate('allocations.userId', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: allotments });
});

module.exports = {
  getEligibleStudents,
  getTeams,
  createTeam,
  updateTeam,
  getTeamAllotments,
};
