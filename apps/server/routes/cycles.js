const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const Machine = require("../models/Machine");
const { requireAuth } = require("../middleware/auth");
const { recordAudit } = require("../utils/audit");
const logger = require("../utils/logger");

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
      incubatorId: z.string().optional().default(""),
      controlNegativeOk: z.boolean().optional(),
      controlPositiveOk: z.boolean().optional(),
      readDeadlineAt: z.string().optional().nullable(),
      readAt: z.string().optional().nullable(),
    })
    .optional(),
});

// routes/cycles.js (GET only)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { machineId, start, end, limit = 50 } = req.query;
    const filter = {};

    if (machineId && mongoose.isValidObjectId(machineId)) {
      filter.machineId = machineId;
    }

    if (start || end) {
      filter.startedAt = {};
      if (start) filter.startedAt.$gte = new Date(start); // inclusive
      if (end) filter.startedAt.$lt = new Date(end); // exclusive
    }

    const rows = await Cycle.find(filter)
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit || 50), 200))
      .populate("machineId", "name _id")
      .populate("createdBy", "name email _id")
      .lean();

    res.json({ cycles: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list cycles" });
  }
});

/** POST /api/cycles  (create) — protected, tags createdBy */
router.post("/", requireAuth, async (req, res) => {
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
      if (Number.isFinite(n) && n >= 0) sterileDryMinutes = n;
    }

    let spore = undefined;
    if (data.spore && data.spore.ran) {
      spore = {
        ran: true,
        well: data.spore.well || "",
        lot: data.spore.lot || "",
        expireDate: toDateOnlyOrNull(data.spore.expireDate),
        incubatedAt: toDateOrNull(data.spore.incubatedAt),
        result: data.spore.result || "",
        verifiedAt: toDateOrNull(data.spore.verifiedAt),
        verifiedBy: data.spore.verifiedBy || "",
        incubatorId: data.spore.incubatorId || "",
        controlNegativeOk: !!data.spore.controlNegativeOk,
        controlPositiveOk: !!data.spore.controlPositiveOk,
        readDeadlineAt: toDateOrNull(data.spore.readDeadlineAt),
        readAt: toDateOrNull(data.spore.readAt),
      };
    }

    const authedUserId = req.user?._id || req.userId || req.user;
    if (!authedUserId) return res.status(401).json({ error: "Unauthorized" });

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
      createdBy: authedUserId,
    });

    // AUDIT
    await recordAudit(req, {
      action: "cycle.create",
      targetType: "Cycle",
      targetId: doc._id,
      meta: {
        machineId: doc.machineId,
        loadNumber: doc.loadNumber,
        result: doc.result,
      },
    });

    const populated = await Cycle.findById(doc._id)
      .populate({ path: "machineId", select: "name type location" })
      .populate({ path: "createdBy", select: "name email _id" })
      .lean();

    res.status(201).json({ cycle: populated });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Accepts "YYYY-MM-DD" or ISO
function toDateOnlyOrNull(v) {
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = router;
