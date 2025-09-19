const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const Cycle = require("../models/Cycle");
const Machine = require("../models/Machine");

const router = express.Router();

const bodySchema = z.object({
  machineId: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional().nullable(),
  result: z.enum(["pass", "fail", "abort"]).optional().default("pass"),
  loadNumber: z.string().optional().default(""),
  items: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
});

router.get("/", async (req, res) => {
  try {
    const {
      machineId,
      limit = 20,
      result,
      machineType,
      dateFrom,
      dateTo,
    } = req.query;
    const filter = {};
    if (result) {
      filter.result = result; // 'pass' | 'fail' | 'abort'
    }
    if (machineType) {
      filter.machineType = machineType; // 'sterilizer' | 'washer' | 'ultrasonic'
    }
    if (dateFrom || dateTo) {
      filter.startedAt = {};
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.startedAt.$lte = new Date(dateTo);
    }
    const rows = await Cycle.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json({ cycles: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list cycles" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", issues: parsed.error.issues });
    }
    const data = parsed.data;

    const machine = await Machine.findById(data.machineId).lean();
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const doc = await Cycle.create({
      machineId: data.machineId,
      machineType: machine.type,
      loadNumber: data.loadNumber,
      startedAt: new Date(data.startedAt),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      result: data.result,
      items: data.items,
      notes: data.notes,
    });

    res.status(201).json({ cycle: doc });
  } catch (e) {
    res.status(500).json({ error: "Failed to create cycle" });
  }
});

module.exports = router;
