const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, trim: true, uppercase: true },
  itemName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, enum: ['Glassware', 'Chemical'] },
  subCategory: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  quantityUnit: { type: String, required: true, trim: true },
  storageLocation: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

storeItemSchema.index({ itemCode: 1 }, { unique: true });

storeItemSchema.pre('validate', function (next) {
  if (!this.category) return next();

  if (this.category === 'Glassware') {
    this.quantityUnit = 'pieces';
  }

  const allowedUnits =
    this.category === 'Chemical'
      ? ['mL', 'L', 'uL', 'mg', 'g', 'kg']
      : ['pieces'];

  if (!allowedUnits.includes(this.quantityUnit)) {
    return next(new Error(`Invalid quantity unit for ${this.category}`));
  }

  next();
});

module.exports = mongoose.model('StoreItem', storeItemSchema);
