const mongoose = require('mongoose');

/**
 * PMPlan: defines a recurring preventive maintenance schedule
 * Fields:
 *  - machineId: Machine this plan belongs to
 *  - name: e.g. "Washer descale (weekly)"
 *  - intervalDays: repeat interval in days
 *  - nextDueAt: next date/time a task should be generated
 *  - isActive: if false, generation is paused
 *  - notes: optional
 */
const PMPlanSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    intervalDays: { type: Number, required: true, min: 1 },
    nextDueAt: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

PMPlanSchema.index({ machineId: 1, nextDueAt: 1, isActive: 1 });

module.exports = mongoose.model('PMPlan', PMPlanSchema);
