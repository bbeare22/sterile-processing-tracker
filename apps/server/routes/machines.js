const express = require("express");
const { z } = require("zod");
const Machine = require("../models/Machine");

const router = express.Router();

// validation
const machineSchema = z.object({
  name: z.string().min(1, "name is required"),
  model: z.string().optional().default(""),
  type: z.enum(["washer", "sterilizer", "ultrasonic"]),
  location: z.string().optional().default(""),
  status: z.enum(["active", "out_of_service"]).optional().default("active"),
  lastDescaleAt: z.string().datetime().optional().nullable(),
});

// GET /api/machines?type=&status=
router.get("/", async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const machines = await Machine.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ machines });
  } catch (e) {
    res.status(500).json({ error: "Failed to list machines" });
  }
});

// POST /api/machines
router.post("/", async (req, res) => {
  try {
    const parsed = machineSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({ error: "Validation failed", messages });
    }
    const payload = parsed.data;
    if (payload.lastDescaleAt)
      payload.lastDescaleAt = new Date(payload.lastDescaleAt);
    if (payload.lastDescaleAt === null) payload.lastDescaleAt = null;

    const doc = await Machine.create(payload);
    res.status(201).json({ machine: doc });
  } catch (e) {
    res.status(500).json({ error: "Failed to create machine" });
  }
});

module.exports = router;
