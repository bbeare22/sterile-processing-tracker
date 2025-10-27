const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const PUBLIC_READ = String(process.env.PUBLIC_READ || '').toLowerCase() === 'true';

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookie = req.headers.cookie || '';
  const m = /(?:^|;\s*)spt_token=([^;]+)/i.exec(cookie);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

function requireAuth(req, res, next) {
  try {
    if (
      PUBLIC_READ &&
      (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS')
    ) {
      return next();
    }
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = { _id: decoded.userId, role: decoded.role || 'tech' };
    return next();
  } catch (err) {
    logger.error('Auth error:', err && err.stack ? err.stack : err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    try {
      const roles = (req.user && (req.user.roles || req.user.role)) || [];
      const has = Array.isArray(roles) ? roles.includes(role) : String(roles) === role;
      if (!has) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch (err) {
      logger.error('requireRole error:', err && err.stack ? err.stack : err);
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

module.exports = { requireAuth, requireRole };
