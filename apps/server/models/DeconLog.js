const mongoose = require('mongoose');

/**
 * Decontamination pickup/return log
 * Mirrors the paper sheet: counts of common dental sets and Women's Clinic items,
 * each with IN/OUT quantities for a given clinic visit.
 */
const inOutSchema = new mongoose.Schema(
  { in: { type: Number, default: 0 }, out: { type: Number, default: 0 } },
  { _id: false }
);

const DeconLogSchema = new mongoose.Schema(
  {
    clinic: { type: String, required: true }, // e.g., "IC", "JET", "Women's", etc.

    // Dates & staff
    receivedAt: { type: Date, required: true }, // when sets were received/picked up
    sentAt: { type: Date }, // when sets were returned
    verifiedInBy: { type: String, default: '' }, // initials
    verifiedOutBy: { type: String, default: '' }, // initials

    // Core dental sets
    sets: {
      basic: { type: inOutSchema, default: () => ({}) },
      oralSurgery: { type: inOutSchema, default: () => ({}) },
      srp: { type: inOutSchema, default: () => ({}) },
      ultrasonic: { type: inOutSchema, default: () => ({}) },
      restorative: { type: inOutSchema, default: () => ({}) },
      endo: { type: inOutSchema, default: () => ({}) },
      denture: { type: inOutSchema, default: () => ({}) },
      rubberDam: { type: inOutSchema, default: () => ({}) },
      xcp: { type: inOutSchema, default: () => ({}) },
    },

    // Women's clinic instruments
    womens: {
      culpo: { type: inOutSchema, default: () => ({}) },
      scissors: { type: inOutSchema, default: () => ({}) },
      speculum: { type: inOutSchema, default: () => ({}) },
      tenaculum: { type: inOutSchema, default: () => ({}) },
      spongeForceps: { type: inOutSchema, default: () => ({}) },
      dilator: { type: inOutSchema, default: () => ({}) },
      bozeman: { type: inOutSchema, default: () => ({}) },
      pessary: { type: inOutSchema, default: () => ({}) },
      iud: { type: inOutSchema, default: () => ({}) },
      misc: { type: inOutSchema, default: () => ({}) },
    },

    notes: { type: String, default: '' },

    // Who created this row
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

DeconLogSchema.index({ receivedAt: -1 });
DeconLogSchema.index({ clinic: 1, receivedAt: -1 });

module.exports = mongoose.model('DeconLog', DeconLogSchema);
