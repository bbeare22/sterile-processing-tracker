const mongoose = require("mongoose");

const CycleSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },

    machineType: {
      type: String,
      enum: ["sterilizer", "washer", "ultrasonic"],
      required: true,
    },

    loadNumber: { type: String, default: "" },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: false },

    result: { type: String, enum: ["pass", "fail", "abort"], default: "pass" },
    items: [{ type: String }],
    notes: { type: String, default: "" },

    operator: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cycle", CycleSchema);
