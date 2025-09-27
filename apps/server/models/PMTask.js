const mongoose = require("mongoose");

/**
 * PMTask: an instance created from a plan to be completed on/around dueAt.
 */
const PMTaskSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PMPlan",
      required: true,
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
      index: true,
    },
    name: { type: String, required: true }, // copied from plan
    dueAt: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "completed", "skipped"],
      default: "pending",
      index: true,
    },

    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completionNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

PMTaskSchema.index({ machineId: 1, status: 1, dueAt: 1 });

module.exports = mongoose.model("PMTask", PMTaskSchema);
