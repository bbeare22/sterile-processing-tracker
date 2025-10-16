const mongoose = require('mongoose');

/**
 * A single transport trip (pickup/return run)
 * Captures times, mileage, destination, and checklist bits from your paper form.
 */
const TransportTripSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true }, // day of trip; also derive from departAt
    driver: { type: String, required: true }, // initials or printed name
    destination: { type: String, required: true }, // e.g., Downtown / Fountain / IC / Mitchell / Women's

    // Mileage & timestamps
    startMileage: { type: Number, required: true, min: 0 },
    departAt: { type: Date, required: true },
    returnAt: { type: Date, required: true },
    returnMileage: { type: Number, required: true, min: 0 },

    // Post-trip items
    washOrGas: { type: Boolean, default: false }, // “Wash/Gas” box
    receiptFiled: { type: Boolean, default: false }, // “Receipt Filed”

    // Checklist (paper form 1..4)
    reviewedSchedule: { type: Boolean, default: false },
    countTransportsMorning: { type: Boolean, default: false },
    countTransportsReturn: { type: Boolean, default: false },
    countTransportsEndOfDay: { type: Boolean, default: false },
    copySheetsNeeded: { type: String, enum: ['yes', 'no', ''], default: '' }, // Yes/No
    gasReceiptSubmitted: { type: String, enum: ['yes', 'na', ''], default: '' },

    // Signatures
    techSignature: { type: String, default: '' },
    supervisorSignature: { type: String, default: '' },

    // Notes (optional)
    notes: { type: String, default: '' },

    // Who logged it
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TransportTripSchema.index({ date: 1 });

module.exports = mongoose.model('TransportTrip', TransportTripSchema);
