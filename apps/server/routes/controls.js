const express = require("express");
const { z } = require("zod");
const ControlBI = require("../models/ControlBI");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* ----------- validators ----------- */
const listQuery = z.object({
  status: z.enum(["pending", "verified", "all"]).default("pending"),
  year: z.string().optional(),
  month: z.string().optional(),
  limit: z.string().optional(),
});

const createBody = z.object({
  incubatorId: z.string().optional(),
  lot: z.string().optional(),
  well: z.string().optional(),
  incubatedAt: z.string().datetime(), // ISO
  notes: z.string().optional(),
});

const verifyBody = z.object({
  result: z.enum(["positive"]), // control must be positive
  verifiedBy: z.string().min(1),
  verifiedAt: z.string().datetime().optional(), // allow override
});

/* ----------- helpers ----------- */
function monthRangeUTC(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return null;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // exclusive
  return { start, end };
}

/* ----------- routes ----------- */

// GET /api/controls
router.get("/", requireAuth, async (req, res) => {
  try {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid query", issues: parsed.error.issues });
    }
    const { status, year, month, limit = "100" } = parsed.data;

    const filter = {};
    if (status === "pending") {
      filter.$or = [{ result: "" }, { result: { $exists: false } }];
    } else if (status === "verified") {
      filter.result = "positive";
    }
    const mr = monthRangeUTC(year, month);
    if (mr) {
      // Filter by incubatedAt within month for list
      filter.incubatedAt = { $gte: mr.start, $lt: mr.end };
    }

    const rows = await ControlBI.find(filter)
      .sort({ incubatedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit), 500))
      .lean();

    res.json({ controls: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list control BIs" });
  }
});

// POST /api/controls
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const data = parsed.data;

    const doc = await ControlBI.create({
      incubatorId: data.incubatorId || "",
      lot: data.lot || "",
      well: data.well || "",
      incubatedAt: new Date(data.incubatedAt),
      notes: data.notes || "",
      createdBy: req.user?._id || req.userId || req.user,
    });

    res.status(201).json({ control: doc });
  } catch (e) {
    res.status(500).json({ error: "Failed to create control BI" });
  }
});

// PATCH /api/controls/:id/verify
router.patch("/:id/verify", requireAuth, async (req, res) => {
  try {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { result, verifiedBy, verifiedAt } = parsed.data;

    // guard: control BIs must verify POSITIVE
    if (result !== "positive") {
      return res.status(400).json({ error: "Control BI must verify positive" });
    }

    const c = await ControlBI.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Not found" });

    c.result = "positive";
    c.verifiedBy = verifiedBy;
    c.verifiedAt = verifiedAt ? new Date(verifiedAt) : new Date();
    await c.save();

    res.json({ control: c.toObject() });
  } catch (e) {
    res.status(500).json({ error: "Failed to verify control BI" });
  }
});

module.exports = router;
