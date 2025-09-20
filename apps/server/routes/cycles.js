const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const Machine = require("../models/Machine");
const { auth } = require("../middleware/auth");

const router = express.Router();

const cycleBody = z.object({
  machineId: z.string().min(1, "machineId is required"),
  machineType: z.enum(["washer", "sterilizer", "ultrasonic"]).optional(),

  startedAt: z.string().min(1, "startedAt is required"),
  completedAt: z.string().optional().nullable(),

  loadNumber: z.string().optional().default(""),
  result: z.enum(["pass", "fail"], { required_error: "result is required" }),

  clinicName: z.string().optional().default(""),
  loadStaff: z.string().optional().default(""),
  unloadStaff: z.string().optional().default(""),

  sterileDryMinutes: z.union([z.string(), z.number()]).optional(),
  maxTempPressure: z.string().optional().default(""),

  items: z.string().optional().default(""),
  notes: z.string().optional().default(""),

  spore: z
    .object({
      ran: z.boolean().optional(),
      well: z.string().optional().default(""),
      lot: z.string().optional().default(""),
      expireDate: z.string().optional().nullable(),
      incubatedAt: z.string().optional().nullable(),
      result: z.enum(["negative", "positive"]).optional(),
      verifiedAt: z.string().optional().nullable(),
      verifiedBy: z.string().optional().default(""),
    })
    .optional(),
});

/** GET /api/cycles  (populates machine name) */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 25), 200);
    const filter = {};
    if (req.query.machineId && mongoose.isValidObjectId(req.query.machineId)) {
      filter.machineId = req.query.machineId;
    }
    const rows = await Cycle.find(filter)
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate({ path: "machineId", select: "name type location" })
      .lean();
    res.json({ cycles: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list cycles" });
  }
});

/** POST /api/cycles  (create) */
router.post("/", auth, async (req, res) => {
  try {
    const parsed = cycleBody.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return res.status(400).json({ error: "Validation failed", issues });
    }

    const data = { ...parsed.data };

    if (!mongoose.isValidObjectId(data.machineId)) {
      return res.status(400).json({ error: "Invalid machineId" });
    }
    const machine = await Machine.findById(data.machineId).lean();
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const machineType = data.machineType || machine.type;
    if (!["washer", "sterilizer", "ultrasonic"].includes(machineType)) {
      return res.status(400).json({ error: "Invalid machineType" });
    }

    const startedAt = toDateOrNull(data.startedAt);
    if (!startedAt)
      return res.status(400).json({ error: "startedAt must be a valid date" });
    const completedAt = toDateOrNull(data.completedAt);

    let sterileDryMinutes = undefined;
    if (data.sterileDryMinutes !== undefined && data.sterileDryMinutes !== "") {
      const n = Number(data.sterileDryMinutes);
      if (Number.isFinite(n)) sterileDryMinutes = n;
    }

    let spore = undefined;
    if (data.spore && data.spore.ran) {
      spore = {
        ran: true,
        well: data.spore.well || "",
        lot: data.spore.lot || "",
        expireDate: toDateOnlyOrNull(data.spore.expireDate),
        incubatedAt: toDateOrNull(data.spore.incubatedAt),
        result: data.spore.result || "negative",
        verifiedAt: toDateOrNull(data.spore.verifiedAt),
        verifiedBy: data.spore.verifiedBy || "",
      };
    }

    const doc = await Cycle.create({
      machineId: data.machineId,
      machineType,
      startedAt,
      completedAt,
      loadNumber: data.loadNumber || "",
      result: data.result,
      clinicName: data.clinicName || "",
      loadStaff: data.loadStaff || "",
      unloadStaff: data.unloadStaff || "",
      sterileDryMinutes,
      maxTempPressure: data.maxTempPressure || "",
      items: data.items || "",
      notes: data.notes || "",
      spore,
    });

    const populated = await Cycle.findById(doc._id)
      .populate({ path: "machineId", select: "name type location" })
      .lean();

    res.status(201).json({ cycle: populated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Accepts "YYYY-MM-DD" or ISO; stores as Date at 00:00Z for date-only
function toDateOnlyOrNull(v) {
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = router;
