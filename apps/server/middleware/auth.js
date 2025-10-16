const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

/**
 * Extract token from Authorization: Bearer <token> OR cookie "spt_token".
 */
function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  // simple cookie parse (no dependency)
  const cookie = req.headers.cookie || "";
  const m = /(?:^|;\s*)spt_token=([^;]+)/i.exec(cookie);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

/**
 * requireAuth: verifies JWT and sets req.user (and req.userId).
 * - NEVER throws; always responds 401 on failure.
 */
function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const secret = process.env.JWT_SECRET || process.env.SECRET || "devsecret";
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // normalize
    const userId = payload.userId || payload.sub || payload._id || payload.id;
    req.user = { _id: userId, ...payload };
    req.userId = userId;
    res.locals.userId = userId;

    return next();
  } catch (err) {
    // Absolute last-resort safety: never leak a 500 out of auth.
    logger.error("requireAuth error:", err && err.stack ? err.stack : err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * requireRole(role): optional role gate. Never throws; 403 on fail.
 */
function requireRole(role) {
  return (req, res, next) => {
    try {
      const roles = (req.user && (req.user.roles || req.user.role)) || [];
      const has = Array.isArray(roles)
        ? roles.includes(role)
        : String(roles) === role;
      if (!has) return res.status(403).json({ error: "Forbidden" });
      return next();
    } catch (err) {
      logger.error("requireRole error:", err && err.stack ? err.stack : err);
      return res.status(403).json({ error: "Forbidden" });
    }
  };
}

module.exports = { requireAuth, requireRole };
