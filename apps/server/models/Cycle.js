const mongoose = require("mongoose");

const SporeSchema = new mongoose.Schema(
  {
    ran: { type: Boolean, default: false },
    well: { type: String, default: "" },
    lot: { type: String, default: "" },
    expireDate: { type: Date },
    incubatedAt: { type: Date },
    result: {
      type: String,
      enum: ["negative", "positive"],
      default: "negative",
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: String, default: "" },
  },
  { _id: false }
);

const CycleSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    machineType: {
      type: String,
      enum: ["washer", "sterilizer", "ultrasonic"],
      required: true,
    },

    startedAt: { type: Date, required: true },
    completedAt: { type: Date },

    loadNumber: { type: String, default: "" },
    result: { type: String, enum: ["pass", "fail"], required: true },

    clinicName: { type: String, default: "" },
    loadStaff: { type: String, default: "" },
    unloadStaff: { type: String, default: "" },

    sterileDryMinutes: { type: Number },
    maxTempPressure: { type: String, default: "" },

    items: { type: String, default: "" },
    notes: { type: String, default: "" },

    spore: { type: SporeSchema, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cycle", CycleSchema);
