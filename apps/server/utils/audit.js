const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

/**
 * recordAudit: safely logs user actions to AuditLog.
 * - Never blocks or throws.
 * - Captures key context (userId, IP, UA, etc.)
 */
async function recordAudit(req, { action, targetType, targetId, meta = {} }) {
  try {
    if (!req) return;

    const user = req.user || {};
    const userId = user._id || req.userId || null;
    const userEmail = user.email || null;
    const role = user.role || null;

    await AuditLog.create({
      userId,
      userEmail,
      role,
      action,
      targetType,
      targetId,
      meta,
      ip: req.ip || req.headers["x-forwarded-for"] || null,
      ua: req.headers["user-agent"] || "",
    });
  } catch (err) {
    // Log once for visibility but never crash
    logger.error(
      "⚠️  Audit log failed (ignored):",
      err?.message || err,
      err?.stack ? "\n" + err.stack : ""
    );
  }
}

module.exports = { recordAudit };
