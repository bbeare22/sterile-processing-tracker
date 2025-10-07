const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Machine = require("../models/Machine");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordAudit } = require("../utils/audit");

const router = express.Router();

/** Validation  */
const machineSchema = z.object({
  name: z.string().min(1, "name is required"),
  model: z.string().optional().default(""),
  type: z.enum(["washer", "sterilizer", "ultrasonic"]),
  location: z.string().optional().default(""),
  status: z
    .enum(["active", "inactive", "out_of_service"])
    .optional()
    .default("active"),
  lastDescaleAt: z.string().datetime().optional().nullable(),
});

function normalizePayload(p) {
  const payload = { ...p };
  // status: map "out_of_service" -> "inactive"
  if (payload.status === "out_of_service") payload.status = "inactive";

  // lastDescaleAt normalization
  if (payload.lastDescaleAt === "") payload.lastDescaleAt = null;
  if (typeof payload.lastDescaleAt === "string") {
    payload.lastDescaleAt = new Date(payload.lastDescaleAt);
  }
  return payload;
}

/** GET /api/machines */
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
router.post("/", requireAuth, requireRole("supervisor"), async (req, res) => {
  try {
    const parsed = machineSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({ error: "Validation failed", messages });
    }
    const payload = normalizePayload(parsed.data);
    const doc = await Machine.create(payload);

    // AUDIT
    await recordAudit(req, {
      action: "machine.create",
      targetType: "Machine",
      targetId: doc._id,
      meta: { name: doc.name, type: doc.type },
    });

    res.status(201).json({ machine: doc });
  } catch (e) {
    res.status(500).json({ error: "Failed to create machine" });
  }
});

/** GET /api/machines/:id */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const m = await Machine.findById(id).lean();
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json({ machine: m });
  } catch (e) {
    res.status(500).json({ error: "Failed to get machine" });
  }
});

// PUT /api/machines/:id
router.put("/:id", requireAuth, requireRole("supervisor"), async (req, res) => {
  try {
    const parsed = machineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", issues: parsed.error.issues });
    }
    const update = normalizePayload(parsed.data);
    const machine = await Machine.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!machine) return res.status(404).json({ error: "Not found" });

    // AUDIT
    await recordAudit(req, {
      action: "machine.update",
      targetType: "Machine",
      targetId: machine._id,
      meta: update,
    });

    res.json({ machine });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/machines/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const gone = await Machine.findByIdAndDelete(req.params.id);
      if (!gone) return res.status(404).json({ error: "Not found" });

      // AUDIT
      await recordAudit(req, {
        action: "machine.delete",
        targetType: "Machine",
        targetId: gone._id,
        meta: { name: gone.name, type: gone.type },
      });

      res.status(204).end();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
