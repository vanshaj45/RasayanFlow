const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Lab = require('../models/Lab');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
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

  if (lab.admins.some((id) => id.toString() === admin._id.toString())) {
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

const deleteLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const lab = await Lab.findById(labId).session(session);
      if (!lab) {
        res.status(404);
        throw new Error('Lab not found');
      }

      const linkedUsers = await User.find({ labId: lab._id }).session(session).select('_id');
      const linkedUserIds = linkedUsers.map((user) => user._id);
      const inventoryItemIds = await Inventory.find({ labId: lab._id }).session(session).distinct('_id');

      await Inventory.deleteMany({ labId: lab._id }).session(session);
      await Transaction.deleteMany({
        $or: [
          { labId: lab._id },
          { itemId: { $in: inventoryItemIds } },
        ],
      }).session(session);

      if (linkedUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: linkedUserIds } },
          [
            {
              $set: {
                labId: null,
                role: {
                  $cond: [{ $eq: ['$role', 'labAdmin'] }, 'student', '$role'],
                },
                isApproved: {
                  $cond: [{ $eq: ['$role', 'labAdmin'] }, false, '$isApproved'],
                },
              },
            },
          ],
          { session },
        );
      }

      await lab.deleteOne({ session });
      await ActivityLog.create([
        {
          userId: req.user._id,
          action: 'delete_lab',
          details: `Deleted lab ${lab.labName} (${lab.labCode})`,
        },
      ], { session });
    });
  } finally {
    session.endSession();
  }

  res.json({ success: true, message: 'Lab deleted successfully' });
});

module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab };
