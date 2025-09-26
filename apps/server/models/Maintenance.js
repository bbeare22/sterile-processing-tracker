const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    type: {
      type: String,
      enum: ["descale", "cleaning", "daily_inspection", "repair", "qa"],
      required: true,
    },
    volumeUsedMl: { type: Number, default: 0 },
    performedAt: { type: Date, required: true },
    notes: { type: String, default: "" },

    // NEW: track who logged it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

MaintenanceSchema.index({ machineId: 1, performedAt: -1 });
MaintenanceSchema.index({ performedAt: -1 });

module.exports = mongoose.model("Maintenance", MaintenanceSchema);
