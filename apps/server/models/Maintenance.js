// apps/server/models/Maintenance.js
const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
    },

    // Types include washer-specific daily & weekly
    type: {
      type: String,
      enum: [
        'descale',
        'cleaning',
        'daily_inspection',
        'repair',
        'qa',
        'washer_daily_verify',
        'washer_weekly_tasks',
      ],
      required: true,
    },

    volumeUsedMl: { type: Number, default: 0 }, // only used for "descale"
    performedAt: { type: Date, required: true },
    notes: { type: String, default: '' },

    // structured payload for checklists / initials
    details: { type: mongoose.Schema.Types.Mixed, default: {} },

    // who logged it (from auth)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

MaintenanceSchema.index({ machineId: 1, performedAt: -1 });
MaintenanceSchema.index({ performedAt: -1 });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
