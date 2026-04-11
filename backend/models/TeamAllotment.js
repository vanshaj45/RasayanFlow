const mongoose = require('mongoose');

const teamMemberAllocationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const teamAllotmentSchema = new mongoose.Schema({
  requestTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  experimentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamName: { type: String, trim: true, default: '' },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  chemicalName: { type: String, required: true, trim: true },
  totalQuantity: { type: Number, required: true, min: 0 },
  quantityUnit: { type: String, required: true, trim: true },
  memberCount: { type: Number, required: true, min: 1 },
  perMemberQuantity: { type: Number, required: true, min: 0 },
  allocations: { type: [teamMemberAllocationSchema], default: [] },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TeamAllotment', teamAllotmentSchema);
