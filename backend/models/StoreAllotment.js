const mongoose = require('mongoose');

const storeAllotmentSchema = new mongoose.Schema({
  storeItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allottedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, required: true, trim: true },
  purpose: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  requestNotes: { type: String, trim: true, default: '' },
  reviewNotes: { type: String, trim: true, default: '' },
  dueDate: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StoreAllotment', storeAllotmentSchema);
