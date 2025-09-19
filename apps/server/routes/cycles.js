const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const { auth } = require("../middleware/auth");

const router = express.Router();

/** Validation for create/update */
const cycleSchema = z.object({
  machineId: z.string().min(1),
  loadNumber: z.string().optional().default(""),
  result: z.enum(["pass", "fail"]).default("pass"),
  itemsText: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});

router.get("/", async (req, res) => {
  try {
    const { machineId, todayOnly, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit || 20), 200);

    const filter = {};
    if (machineId) {
      if (!mongoose.isValidObjectId(machineId)) {
        return res.status(400).json({ error: "Invalid machineId" });
      }
      filter.machineId = machineId;
    }
    if (todayOnly === "true") {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      filter.startedAt = { $gte: start, $lte: end };
    }
    if (from || to) {
      filter.startedAt = filter.startedAt || {};
      if (from) filter.startedAt.$gte = new Date(from);
      if (to) filter.startedAt.$lte = new Date(to);
    }

    const cycles = await Cycle.find(filter)
      .sort({ startedAt: -1 })
      .limit(limit)
      .populate("machineId", "name type location")
      .lean();

    res.json({ cycles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list cycles" });
  }
});

/** POST /api/cycles */
router.post("/", auth, async (req, res) => {
  try {
    const parsed = cycleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const payload = {
      ...parsed.data,
      startedAt: new Date(parsed.data.startedAt),
      completedAt: new Date(parsed.data.completedAt),
    };
    const doc = await Cycle.create(payload);
    const populated = await doc.populate("machineId", "name type location");
    res.status(201).json({ cycle: populated.toJSON() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create cycle" });
  }
});

/** PUT /api/cycles/:id */
router.put("/:id", auth, async (req, res) => {
  try {
    const parsed = cycleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const update = {
      ...parsed.data,
      startedAt: new Date(parsed.data.startedAt),
      completedAt: new Date(parsed.data.completedAt),
    };
    const doc = await Cycle.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).populate("machineId", "name type location");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ cycle: doc.toJSON() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update cycle" });
  }
});

/** DELETE /api/cycles/:id */
router.delete("/:id", auth, async (req, res) => {
  try {
    const gone = await Cycle.findByIdAndDelete(req.params.id);
    if (!gone) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete cycle" });
  }
});

module.exports = router;
