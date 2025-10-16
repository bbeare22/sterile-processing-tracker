const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const { requireAuth } = require("../middleware/auth");
const { recordAudit } = require("../utils/audit");
const logger = require("../utils/logger");

const router = express.Router();

/* ----------------- Validation ----------------- */
const ListQuery = z.object({
  status: z.enum(["pending", "verified", "all"]).optional(), // default pending
  incubatorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const VerifyBody = z.object({
  result: z.enum(["negative", "positive"]),
  verifiedBy: z.string().min(1),
  // allow client to pass a datetime; otherwise we will default to now
  verifiedAt: z.string().datetime().optional(),
});

/* ----------------- Helpers ----------------- */
function isObjectId(id) {
  return mongoose.isValidObjectId(id);
}

/* ----------------- GET /api/spores -----------------
   Returns cycles that have a spore test associated.
   Filters:
     - status=pending -> spore.ran=true AND missing result
     - status=verified -> spore.ran=true AND result in ['negative','positive']
     - status=all -> spore.ran=true
     - incubatorId (optional string match)
---------------------------------------------------- */
router.get("/", requireAuth, async (req, res) => {
  try {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const { status = "pending", incubatorId, limit = 50 } = parsed.data;

    const base = { "spore.ran": true };

    if (status === "pending") {
      // pending = no result set yet
      base.$or = [
        { "spore.result": { $exists: false } },
        { "spore.result": { $in: ["", null] } },
      ];
    } else if (status === "verified") {
      base["spore.result"] = { $in: ["negative", "positive"] };
    }

    if (incubatorId && incubatorId.trim()) {
      base["spore.incubatorId"] = { $regex: incubatorId.trim(), $options: "i" };
    }

    const rows = await Cycle.find(base)
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate("machineId", "name location _id")
      .lean();

    res.json({ spores: rows });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Failed to load spore queue" });
  }
});

/* -------- PATCH /api/spores/:id/verify -----------
   Body: { result: 'negative'|'positive', verifiedBy: string, verifiedAt?: ISO }
   Marks a spore readout as verified on the underlying Cycle document.
--------------------------------------------------- */
// PATCH /api/spores/:id/verify
router.patch("/:id/verify", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const VerifyBody = z.object({
      result: z.enum(["negative", "positive"]),
      verifiedBy: z.string().min(1),
      verifiedAt: z.string().datetime().optional(),
    });
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const body = parsed.data;

    const cycle = await Cycle.findById(id);
    if (!cycle) return res.status(404).json({ error: "Cycle not found" });
    if (!cycle.spore || !cycle.spore.ran) {
      return res
        .status(400)
        .json({ error: "Spore test was not recorded for this cycle" });
    }

    cycle.spore.result = body.result;
    cycle.spore.verifiedBy = body.verifiedBy;
    cycle.spore.verifiedAt = body.verifiedAt
      ? new Date(body.verifiedAt)
      : new Date();
    await cycle.save();

    // AUDIT
    await recordAudit(req, {
      action: "spore.verify",
      targetType: "Cycle",
      targetId: cycle._id,
      meta: { result: body.result, verifiedBy: body.verifiedBy },
    });

    const populated = await Cycle.findById(cycle._id)
      .populate("machineId", "name location _id")
      .lean();

    res.json({ cycle: populated });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Failed to verify spore" });
  }
});

module.exports = router;
