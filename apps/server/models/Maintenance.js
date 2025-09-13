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
      enum: ["descale", "cleaning", "repair", "qa"],
      required: true,
    },
    volumeUsedMl: { type: Number, default: 0 }, // for descale
    performedAt: { type: Date, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Maintenance", MaintenanceSchema);
