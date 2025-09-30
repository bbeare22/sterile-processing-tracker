const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Machine = require("../models/Machine");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const WASHER_TYPES = ["washer", "ultrasonic"];
const STERILIZER_TYPES = ["sterilizer"];

// Incoming body validation
const BaseBody = z.object({
  machineId: z.string().min(1),
  type: z.enum(["descale", "daily_inspection", "cleaning", "repair", "qa"]),
  performedAt: z.string().datetime(),
  volumeUsedMl: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional(),
  performedBy: z.string().min(1, "performedBy (initials) is required").max(40),
});

// GET /api/maintenance
router.get("/", async (req, res) => {
  try {
    const { machineId, limit = 20, start, end } = req.query;

    const filter = {};
    if (machineId) filter.machineId = machineId;

    // Optional date window (UTC) on performedAt
    if (start || end) {
      filter.performedAt = {};
      if (start) filter.performedAt.$gte = new Date(start);
      if (end) filter.performedAt.$lt = new Date(end);
    }

    const rows = await Maintenance.find(filter)
      .sort({ performedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit), 200))
      .populate("machineId", "name _id")
      .populate("createdBy", "name email _id")
      .lean();

    res.json({ maintenance: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list maintenance" });
  }
});

// POST /api/maintenance (create) — protected
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = BaseBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.issues,
      });
    }
    const body = parsed.data;

    if (!mongoose.isValidObjectId(body.machineId)) {
      return res.status(400).json({ error: "Invalid machineId" });
    }
    const machine = await Machine.findById(body.machineId).lean();
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const isWasher = WASHER_TYPES.includes(machine.type);
    const isSterilizer = STERILIZER_TYPES.includes(machine.type);

    if (isWasher) {
      if (body.type !== "descale") {
        return res
          .status(400)
          .json({ error: "Invalid maintenance type for this machine" });
      }
      if (body.volumeUsedMl == null) {
        return res
          .status(400)
          .json({ error: "volumeUsedMl is required for descale" });
      }
    } else if (isSterilizer) {
      if (!["daily_inspection", "cleaning"].includes(body.type)) {
        return res
          .status(400)
          .json({ error: "Invalid maintenance type for sterilizer" });
      }
      body.volumeUsedMl = null;
    }

    // authenticated user id (set by requireAuth)
    const authedUserId = req.user?._id || req.userId || req.user;
    if (!authedUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = {
      machineId: body.machineId,
      type: body.type,
      performedAt: new Date(body.performedAt),
      notes: body.notes || "",
      volumeUsedMl:
        isWasher && body.type === "descale" ? Number(body.volumeUsedMl) : null,
      performedBy: body.performedBy.trim(), // store initials
      createdBy: authedUserId,
    };

    const doc = await Maintenance.create(payload);

    // (optional) populate before returning for nicer client display
    const populated = await Maintenance.findById(doc._id)
      .populate("machineId", "name _id")
      .populate("createdBy", "name email _id")
      .lean();

    res.status(201).json({ maintenance: populated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create maintenance" });
  }
});

module.exports = router;
