const AuditLog = require("../models/AuditLog");

async function recordAudit(req, { action, targetType, targetId, meta = {} }) {
  try {
    await AuditLog.create({
      userId: req.user?._id || req.userId,
      userEmail: req.user?.email,
      role: req.user?.role,
      action,
      targetType,
      targetId,
      meta,
      ip: req.ip,
      ua: req.headers["user-agent"] || "",
    });
  } catch (_) {
    // don't block the request on audit failures
  }
}

module.exports = { recordAudit };
