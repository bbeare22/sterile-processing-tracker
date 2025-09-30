const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/spores
// Supports status=pending|verified|all, incubatorId, limit,
// and optional start/end window on date "basis":
//   basis=incubated (default)  -> spore.incubatedAt
//   basis=verified             -> spore.verifiedAt
//   basis=started              -> startedAt (cycle start)
router.get("/", async (req, res) => {
  try {
    const {
      status = "pending",
      incubatorId = "",
      limit = 50,
      basis = "incubated",
      start,
      end,
      machineId,
    } = req.query;

    const filter = {};
    if (machineId) filter.machineId = machineId;

    // status filter
    if (status !== "all") {
      if (status === "pending") {
        // pending = spore.ran true AND (no result yet)
        filter["spore.ran"] = true;
        filter.$or = [
          { "spore.result": { $exists: false } },
          { "spore.result": "" },
          { "spore.result": null },
        ];
      } else if (status === "verified") {
        filter["spore.result"] = { $in: ["negative", "positive"] };
      }
    }

    // incubator filter
    if (incubatorId.trim()) {
      filter["spore.incubatorId"] = incubatorId.trim();
    }

    // date-basis window
    let datePath = "spore.incubatedAt";
    if (basis === "verified") datePath = "spore.verifiedAt";
    if (basis === "started") datePath = "startedAt";

    if (start || end) {
      filter[datePath] = {};
      if (start) filter[datePath].$gte = new Date(start);
      if (end) filter[datePath].$lt = new Date(end);
    }

    const rows = await Cycle.find(filter) // spores live on cycles
      .sort({ [datePath]: -1, startedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit), 200))
      .populate("machineId", "name location _id")
      .lean();

    res.json({ spores: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list spores" });
  }
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
