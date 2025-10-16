const express = require("express");
const { z } = require("zod");
const DeconLog = require("../models/DeconLog");
const { requireAuth } = require("../middleware/auth");
const { recordAudit } = require("../utils/audit");
const logger = require("../utils/logger");

const router = express.Router();

const inOut = z.object({
  in: z.number().int().nonnegative().default(0),
  out: z.number().int().nonnegative().default(0),
});

const Body = z.object({
  clinic: z.string().min(1),
  receivedAt: z.string().datetime(),
  sentAt: z.string().datetime().optional().nullable(),
  verifiedInBy: z.string().optional(),
  verifiedOutBy: z.string().optional(),
  notes: z.string().optional(),
  sets: z
    .object({
      basic: inOut.optional(),
      oralSurgery: inOut.optional(),
      srp: inOut.optional(),
      ultrasonic: inOut.optional(),
      restorative: inOut.optional(),
      endo: inOut.optional(),
      denture: inOut.optional(),
      rubberDam: inOut.optional(),
      xcp: inOut.optional(),
    })
    .optional(),
  womens: z
    .object({
      culpo: inOut.optional(),
      scissors: inOut.optional(),
      speculum: inOut.optional(),
      tenaculum: inOut.optional(),
      spongeForceps: inOut.optional(),
      dilator: inOut.optional(),
      bozeman: inOut.optional(),
      pessary: inOut.optional(),
      iud: inOut.optional(),
      misc: inOut.optional(),
    })
    .optional(),
});

// GET /api/decon?year=2025&month=9&clinic=IC&limit=100
router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const filter = {};
    if (req.query.clinic) filter.clinic = req.query.clinic;

    // month filter (UTC)
    const y = Number(req.query.year);
    const m = Number(req.query.month); // 1..12
    if (y && m) {
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      filter.receivedAt = { $gte: start, $lt: end };
    }

    const rows = await DeconLog.find(filter)
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name email _id")
      .lean();

    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list decon rows" });
  }
});

// POST /api/decon
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const b = parsed.data;

    const doc = await DeconLog.create({
      clinic: b.clinic,
      receivedAt: new Date(b.receivedAt),
      sentAt: b.sentAt ? new Date(b.sentAt) : undefined,
      verifiedInBy: b.verifiedInBy || "",
      verifiedOutBy: b.verifiedOutBy || "",
      notes: b.notes || "",
      sets: b.sets || {},
      womens: b.womens || {},
      createdBy: req.user?._id || req.userId || req.user,
    });

    // AUDIT
    await recordAudit(req, {
      action: "decon.create",
      targetType: "DeconLog",
      targetId: doc._id,
      meta: { clinic: doc.clinic },
    });

    res.status(201).json({ row: doc });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Failed to create decon row" });
  }
});

module.exports = router;
