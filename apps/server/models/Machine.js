const mongoose = require("mongoose");

const MachineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    model: { type: String, default: "" },
    type: {
      type: String,
      enum: ["washer", "sterilizer", "ultrasonic"],
      required: true,
    },
    location: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "out_of_service"],
      default: "active",
    },
    lastDescaleAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", MachineSchema);
