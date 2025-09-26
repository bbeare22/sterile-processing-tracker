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
      enum: ["negative", "positive", "invalid", ""],
      default: "",
    },
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
      enum: ["sterilizer", "washer", "ultrasonic"],
      required: true,
    },

    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    loadNumber: { type: String, default: "" },
    result: { type: String, enum: ["pass", "fail", "aborted"], required: true },

    items: { type: String, default: "" },
    notes: { type: String, default: "" },

    clinicName: { type: String, default: "" },
    loadStaff: { type: String, default: "" },
    unloadStaff: { type: String, default: "" },
    sterileDryMinutes: { type: String, default: "" },
    maxTempPressure: { type: String, default: "" },

    spore: { type: SporeSchema, default: () => ({}) },

    verifiedAt: { type: Date },
    verifiedBy: { type: String, default: "" },

    // NEW: track who logged it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

CycleSchema.index({ machineId: 1, startedAt: -1 });
CycleSchema.index({ startedAt: -1 });
CycleSchema.index({ machineType: 1, startedAt: -1 });

module.exports = mongoose.model("Cycle", CycleSchema);
