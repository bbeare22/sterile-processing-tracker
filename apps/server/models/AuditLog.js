const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, default: '' },
    role: { type: String, default: '' },

    action: { type: String, required: true }, // e.g., "cycle.create"
    targetType: { type: String, default: '' }, // "Cycle" | "Maintenance" | ...
    targetId: { type: mongoose.Schema.Types.ObjectId },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // arbitrary metadata

    ip: { type: String, default: '' },
    ua: { type: String, default: '' },
  },
  { timestamps: true }
);

// Helpful indexes for dashboard & audits
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
