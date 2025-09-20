const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Machine = require("../models/Machine");
const { auth } = require("../middleware/auth");

const router = express.Router();

const WASHER_TYPES = ["washer", "ultrasonic"];
const STERILIZER_TYPES = ["sterilizer"];

const BaseBody = z.object({
  machineId: z.string().min(1),
  type: z.enum(["descale", "daily_inspection", "cleaning"]),
  performedAt: z.string().datetime(),
  volumeUsedMl: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional(),
});

// GET /api/maintenance
router.get("/", async (req, res) => {
  try {
    const { machineId, limit = 20 } = req.query;
    const filter = {};
    if (machineId) filter.machineId = machineId;

    const rows = await Maintenance.find(filter)
      .sort({ performedAt: -1, createdAt: -1 })
      .limit(Number(limit))
      .populate("machineId", "name _id")
      .lean();

    res.json({ maintenance: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list maintenance" });
  }
});

// POST /api/maintenance
router.post("/", auth, async (req, res) => {
  try {
    const baseParsed = BaseBody.safeParse(req.body);
    if (!baseParsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: baseParsed.error.issues,
      });
    }
    const body = baseParsed.data;

    if (!mongoose.isValidObjectId(body.machineId)) {
      return res.status(400).json({ error: "Invalid machineId" });
    }
    const machine = await Machine.findById(body.machineId).lean();
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const isWasher = WASHER_TYPES.includes(machine.type);
    const isSterilizer = STERILIZER_TYPES.includes(machine.type);

    if (isWasher) {
      if (body.type !== "descale") {
        return res.status(400).json({
          error: "Invalid maintenance type for this machine",
        });
      }
      if (body.volumeUsedMl == null) {
        return res
          .status(400)
          .json({ error: "volumeUsedMl is required for descale" });
      }
    } else if (isSterilizer) {
      if (!["daily_inspection", "cleaning"].includes(body.type)) {
        return res.status(400).json({
          error: "Invalid maintenance type for sterilizer",
        });
      }
      body.volumeUsedMl = null;
    } else {
      return res.status(400).json({ error: "Unsupported machine type" });
    }

    const payload = {
      machineId: body.machineId,
      type: body.type,
      performedAt: new Date(body.performedAt),
      notes: body.notes || "",
      volumeUsedMl:
        isWasher && body.type === "descale" ? Number(body.volumeUsedMl) : null,
    };

    const doc = await Maintenance.create(payload);
    res.status(201).json({ maintenance: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create maintenance" });
  }
});

module.exports = router;
