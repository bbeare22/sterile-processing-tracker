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

    // For descale (washers/ultrasonic)
    volumeUsedMl: { type: Number, default: 0 },

    performedAt: { type: Date, required: true },

    // Free-text notes
    notes: { type: String, default: "" },

    // NEW: initials of the staff who performed/logged the maintenance (client-entered)
    performedBy: { type: String, trim: true, required: true },

    // Who created the record (from the authenticated user)
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
