const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', default: null },
  experimentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment', default: null },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamName: { type: String, trim: true, default: '' },
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  memberCount: { type: Number, min: 1, default: 1 },
  requestCategory: { type: String, enum: ['inventory', 'experiment'], default: 'inventory' },
  experimentTitle: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  type: { type: String, enum: ['borrow', 'return'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  purpose: { type: String, trim: true, default: '' },
  neededUntil: { type: Date, default: null },
  requesterName: { type: String, trim: true, default: '' },
  requesterEmail: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNotes: { type: String, trim: true, default: '' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);
