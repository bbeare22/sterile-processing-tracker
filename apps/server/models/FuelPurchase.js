const mongoose = require('mongoose');

/**
 * Fuel purchase log (from the fuel sheet).
 * Minimal fields to match the sheet; optional extras allowed.
 */
const FuelPurchaseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    mileage: { type: Number, required: true, min: 0 },
    pricePerGallon: { type: Number, required: true, min: 0 }, // e.g., 3.799
    gallons: { type: Number, min: 0 }, // optional if you want to compute totals
    amount: { type: Number, min: 0 }, // optional: total $ paid
    vendor: { type: String, default: '' }, // optional: station name
    signature: { type: String, default: '' }, // initials/printed
    notes: { type: String, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FuelPurchaseSchema.index({ date: 1 });

module.exports = mongoose.model('FuelPurchase', FuelPurchaseSchema);
