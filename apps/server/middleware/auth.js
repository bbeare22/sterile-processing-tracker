const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Extract Bearer token from Authorization header */
function parseBearer(authHeader) {
  if (!authHeader) return null;
  const [scheme, token] = String(authHeader).split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

/**
 * Require a valid JWT. Attaches:
 *   - req.userId  : ObjectId as string
 *   - req.user    : minimal user document (no password)
 */
async function requireAuth(req, res, next) {
  try {
    const token = parseBearer(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: no token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Unauthorized: invalid token" });
    }

    const userId = decoded.userId || decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: malformed token" });
    }

    // Load the user; exclude password
    const user = await User.findById(userId).select("+role +email +name");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    req.userId = user._id.toString();
    // expose a minimal safe user (no password)
    req.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || "tech",
    };

    return next();
  } catch (e) {
    return res.status(500).json({ error: "Auth middleware error" });
  }
}

/**
 * Require a specific role. Example:
 *   router.post("/admin-only", requireAuth, requireRole("supervisor"), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    const ok = req?.user?.role === role;
    if (!ok) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
