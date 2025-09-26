const jwt = require("jsonwebtoken");
const User = require("../models/User");

function parseBearer(authHeader) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = parseBearer(req.headers.authorization);
    if (!token)
      return res.status(401).json({ error: "Unauthorized: no token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload should contain at least { userId, role } – adjust if your signer differs
    const userId = payload.userId || payload._id || payload.id;
    if (!userId)
      return res.status(401).json({ error: "Unauthorized: bad token payload" });

    // (Optional but nice) Ensure user still exists; also get current role from DB
    const user = await User.findById(userId)
      .select("_id role email name")
      .lean();
    if (!user)
      return res.status(401).json({ error: "Unauthorized: user not found" });

    req.userId = user._id.toString();
    req.user = {
      _id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}

// Simple role gate (example usage: router.post(..., requireAuth, requireRole('supervisor'), ...))
function requireRole(role) {
  return (req, res, next) => {
    const ok = req.user?.role === role;
    if (!ok) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
