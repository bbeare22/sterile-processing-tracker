const express = require("express");
const { z } = require("zod");
const Maintenance = require("../models/Maintenance");
const Machine = require("../models/Machine");
const { auth } = require("../middleware/auth");

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid id");

const createSchema = z.object({
  machineId: objectId,
  type: z.enum(["descale", "cleaning", "repair", "qa"]),
  volumeUsedMl: z.number().optional().default(0),
  performedAt: z.string().datetime(),
  notes: z.string().optional().default(""),
});

// POST /api/maintenance
router.post("/", auth, async (req, res) => {
  try {
    // Parse numeric string volume if sent as string
    const body = {
      ...req.body,
      volumeUsedMl: Number(req.body.volumeUsedMl || 0),
    };
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({ error: "Validation failed", messages });
    }
    const payload = parsed.data;
    payload.performedAt = new Date(payload.performedAt);

    // Create maintenance record
    const doc = await Maintenance.create(payload);

    // If descale, update Machine.lastDescaleAt
    if (payload.type === "descale") {
      await Machine.findByIdAndUpdate(payload.machineId, {
        lastDescaleAt: payload.performedAt,
      });
    }

    res.status(201).json({ maintenance: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create maintenance" });
  }
});

// GET /api/maintenance?machineId=&limit=
router.get("/", async (req, res) => {
  try {
    const { machineId, limit = 20 } = req.query;
    const filter = {};
    if (machineId) filter.machineId = machineId;

    const rows = await Maintenance.find(filter)
      .sort({ performedAt: -1 })
      .limit(Number(limit))
      .populate("machineId", "name")
      .lean();

    res.json({ maintenance: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list maintenance" });
  }
});

module.exports = router;
