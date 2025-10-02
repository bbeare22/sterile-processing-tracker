const mongoose = require("mongoose");

/**
 * ControlBI: daily biological indicator (control) that MUST verify POSITIVE.
 * Not tied to a cycle/load.
 */
const ControlBISchema = new mongoose.Schema(
  {
    incubatorId: { type: String, default: "" },
    lot: { type: String, default: "" },
    well: { type: String, default: "" },

    incubatedAt: { type: Date, required: true },
    verifiedAt: { type: Date },
    result: { type: String, enum: ["positive", "negative", ""], default: "" },
    verifiedBy: { type: String, default: "" },

    notes: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

ControlBISchema.index({ incubatedAt: -1 });
ControlBISchema.index({ verifiedAt: -1 });
ControlBISchema.index({ result: 1 });

module.exports = mongoose.model("ControlBI", ControlBISchema);
