const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  labName: { type: String, required: true, trim: true },
  labCode: { type: String, required: true, unique: true, trim: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lab', labSchema);
