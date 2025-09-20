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
      enum: ["descale", "daily_inspection", "cleaning"],
      required: true,
    },

    volumeUsedMl: { type: Number, default: null },
    performedAt: { type: Date, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Maintenance", MaintenanceSchema);
