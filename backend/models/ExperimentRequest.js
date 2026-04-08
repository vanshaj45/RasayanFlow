const mongoose = require('mongoose');

const experimentRequestSchema = new mongoose.Schema({
  experimentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment', required: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  purpose: { type: String, trim: true, default: '' },
  preferredDate: { type: Date, default: null },
  notes: { type: String, trim: true, default: '' },
  requesterName: { type: String, trim: true, default: '' },
  requesterEmail: { type: String, trim: true, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNotes: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ExperimentRequest', experimentRequestSchema);
