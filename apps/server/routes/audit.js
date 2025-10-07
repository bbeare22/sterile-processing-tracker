const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const Query = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});

router.get("/", requireAuth, requireRole("supervisor"), async (req, res) => {
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });
  const { action, userId, limit, since, until } = parsed.data;

  const filter = {};
  if (action) filter.action = action;
  if (userId && mongoose.isValidObjectId(userId)) filter.userId = userId;
  if (since || until) {
    filter.createdAt = {};
    if (since) filter.createdAt.$gte = new Date(since);
    if (until) filter.createdAt.$lte = new Date(until);
  }

  const rows = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ logs: rows });
});

module.exports = router;
