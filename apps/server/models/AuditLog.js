const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userEmail: String,
    role: String,

    action: { type: String, required: true }, // e.g. "cycle.create"
    targetType: String, // "Cycle" | "Maintenance" | ...
    targetId: { type: mongoose.Schema.Types.ObjectId },

    meta: {}, // snapshot of request/body
    ip: String,
    ua: String,
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
