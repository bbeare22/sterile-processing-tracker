const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Status mapping (server-side):
 * - pending: spore.ran=true AND !spore.readAt
 * - ready:   spore.ran=true AND !spore.readAt AND spore.readDeadlineAt <= now (optional stricter)
 * - verified: spore.ran=true AND spore.readAt != null
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const status = String(req.query.status || "pending");

    const base = { "spore.ran": true };
    const now = new Date();

    if (status === "verified") {
      base["spore.readAt"] = { $ne: null };
    } else if (status === "ready") {
      base["spore.readAt"] = null;
      base["spore.readDeadlineAt"] = { $lte: now };
    } else {
      // pending (default): not yet read
      base["spore.readAt"] = null;
    }

    const rows = await Cycle.find(base)
      .sort({ "spore.incubatedAt": -1, startedAt: -1 })
      .limit(limit)
      .populate({ path: "machineId", select: "name type location" })
      .lean();

    res.json({ spores: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list spores" });
  }
});

const verifyBody = z.object({
  result: z.enum(["negative", "positive", "invalid"]),
  readAt: z.string().optional().nullable(), // default now if missing
  verifiedBy: z.string().optional().default(""), // can set from user.name
  controlPositiveOk: z.boolean().optional(),
  controlNegativeOk: z.boolean().optional(),
});

// PATCH /api/spores/:cycleId/verify
router.patch("/:cycleId/verify", requireAuth, async (req, res) => {
  try {
    const { cycleId } = req.params;
    if (!mongoose.isValidObjectId(cycleId)) {
      return res.status(400).json({ error: "Invalid cycleId" });
    }

    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", issues: parsed.error.issues });
    }
    const body = parsed.data;

    const readAt = body.readAt ? new Date(body.readAt) : new Date();
    const verifiedBy =
      body.verifiedBy || req.user?.name || req.user?.email || "";

    const updated = await Cycle.findOneAndUpdate(
      { _id: cycleId, "spore.ran": true },
      {
        $set: {
          "spore.result": body.result,
          "spore.readAt": readAt,
          "spore.verifiedAt": new Date(),
          "spore.verifiedBy": verifiedBy,
          ...(body.controlPositiveOk !== undefined
            ? { "spore.controlPositiveOk": !!body.controlPositiveOk }
            : {}),
          ...(body.controlNegativeOk !== undefined
            ? { "spore.controlNegativeOk": !!body.controlNegativeOk }
            : {}),
        },
      },
      { new: true }
    )
      .populate({ path: "machineId", select: "name type location" })
      .lean();

    if (!updated)
      return res.status(404).json({ error: "Spore not found for this cycle" });
    res.json({ cycle: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to verify spore" });
  }
});

module.exports = router;
