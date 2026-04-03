const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const createLab = asyncHandler(async (req, res) => {
  const { labName, labCode } = req.body;

  if (!labName || !labCode) {
    res.status(400);
    throw new Error('labName and labCode are required');
  }

  const existing = await Lab.findOne({ labCode });
  if (existing) {
    res.status(400);
    throw new Error('labCode already exists');
  }

  const lab = await Lab.create({ labName, labCode, createdBy: req.user._id, admins: [] });

  await ActivityLog.create({ userId: req.user._id, action: 'create_lab', details: `Lab ${labName} (${labCode}) created` });

  res.status(201).json({ success: true, data: lab });
});

const listLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().populate('admins', 'name email role isApproved');
  res.json({ success: true, data: labs });
});

const assignAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  if (lab.admins.length >= 2) {
    res.status(400);
    throw new Error('Lab already has 2 admins');
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    res.status(404);
    throw new Error('Admin user not found');
  }

  if (lab.admins.includes(admin._id)) {
    res.status(400);
    throw new Error('Admin already assigned');
  }

  admin.role = 'labAdmin';
  admin.labId = lab._id;
  await admin.save();

  lab.admins.push(admin._id);
  await lab.save();

  await ActivityLog.create({ userId: req.user._id, action: 'assign_admin', details: `Assigned ${admin.email} to lab ${lab.labCode}` });

  res.json({ success: true, data: lab });
});

const removeAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  lab.admins = lab.admins.filter((id) => id.toString() !== adminId);
  await lab.save();

  const admin = await User.findById(adminId);
  if (admin) {
    admin.role = 'student';
    admin.labId = null;
    admin.isApproved = false;
    await admin.save();
  }

  await ActivityLog.create({ userId: req.user._id, action: 'remove_admin', details: `Removed ${admin?.email || adminId} from lab ${lab.labCode}` });

  res.json({ success: true, data: lab });
});

const approveAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  const admin = await User.findById(adminId);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  admin.isApproved = true;
  await admin.save();

  await ActivityLog.create({ userId: req.user._id, action: 'approve_admin', details: `Approved admin ${admin.email}` });

  res.json({ success: true, data: admin });
});

module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin };
