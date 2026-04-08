const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  itemCode: { type: String, required: true, trim: true, uppercase: true },
  itemName: { type: String, required: true, trim: true },
  chemicalName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  quantityUnit: { type: String, required: true, trim: true },
  costPerUnit: { type: Number, min: 0, default: 0 },
  minThreshold: { type: Number, required: true, min: 0, default: 0 },
  casNumber: { type: String, trim: true, default: '' },
  smiles: { type: String, trim: true, default: '' },
  inchi: { type: String, trim: true, default: '' },
  chemicalFormula: { type: String, trim: true, default: '' },
  manufacturingCompany: { type: String, trim: true, default: '' },
  entryDate: { type: Date, default: Date.now },
  storageLocation: { type: String, trim: true, default: '' },
  lotNumber: { type: String, trim: true, default: '' },
  expiryDate: { type: Date, default: null },
  abstract: { type: String, trim: true, default: '' },
  pubmedId: { type: String, trim: true, default: '' },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

inventorySchema.index({ labId: 1, itemCode: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
