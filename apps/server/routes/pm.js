const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const PMPlan = require("../models/PMPlan");
const PMTask = require("../models/PMTask");
const Machine = require("../models/Machine");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordAudit } = require("../utils/audit");
const logger = require("../utils/logger");

const router = express.Router();

/* ----------------- Validators ----------------- */
const createPlanBody = z.object({
  machineId: z.string().min(1),
  name: z.string().min(1),
  intervalDays: z.number().int().positive(),
  nextDueAt: z.string().datetime(), // ISO
  notes: z.string().optional(),
});

const listTasksQuery = z.object({
  machineId: z.string().optional(),
  status: z.enum(["pending", "completed", "skipped", "all"]).optional(),
  limit: z.string().optional(),
});

const completeTaskBody = z.object({
  notes: z.string().optional(),
  status: z.enum(["completed", "skipped"]).default("completed"),
});

/* ----------------- Helpers ----------------- */
function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/* ----------------- Plans ----------------- */

// Create a plan (supervisor only)
router.post(
  "/plans",
  requireAuth,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const parsed = createPlanBody.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Validation failed", issues: parsed.error.issues });
      }
      const { machineId, name, intervalDays, nextDueAt, notes } = parsed.data;

      if (!mongoose.isValidObjectId(machineId)) {
        return res.status(400).json({ error: "Invalid machineId" });
      }
      const machine = await Machine.findById(machineId).lean();
      if (!machine) return res.status(404).json({ error: "Machine not found" });

      const plan = await PMPlan.create({
        machineId,
        name,
        intervalDays,
        nextDueAt: new Date(nextDueAt),
        notes: notes || "",
        isActive: true,
      });

      // AUDIT
      await recordAudit(req, {
        action: "pm.plan.create",
        targetType: "PMPlan",
        targetId: plan._id,
        meta: { machineId: plan.machineId, name: plan.name, intervalDays },
      });

      res.status(201).json({ plan });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: "Failed to create plan" });
    }
  }
);

// List plans (optionally by machine)
router.get("/plans", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.machineId && mongoose.isValidObjectId(req.query.machineId)) {
      filter.machineId = req.query.machineId;
    }
    const plans = await PMPlan.find(filter).sort({ nextDueAt: 1 }).lean();
    res.json({ plans });
  } catch (e) {
    res.status(500).json({ error: "Failed to list plans" });
  }
});

// Toggle plan active/inactive (supervisor)
router.patch(
  "/plans/:id/toggle",
  requireAuth,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await PMPlan.findById(id);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      plan.isActive = !plan.isActive;
      await plan.save();
      res.json({ plan });
    } catch (e) {
      res.status(500).json({ error: "Failed to toggle plan" });
    }
  }
);

/* ----------------- Task Generation ----------------- */

// Generate next tasks from active plans (idempotent-ish, supervisor)
router.post(
  "/tasks/generate",
  requireAuth,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const plans = await PMPlan.find({ isActive: true }).lean();
      let created = 0;

      for (const p of plans) {
        const hasFuturePending = await PMTask.exists({
          planId: p._id,
          status: "pending",
          dueAt: { $gte: new Date(p.nextDueAt) },
        });

        if (!hasFuturePending) {
          await PMTask.create({
            planId: p._id,
            machineId: p.machineId,
            name: p.name,
            dueAt: new Date(p.nextDueAt),
            status: "pending",
          });
          created += 1;

          const next = addDays(p.nextDueAt, p.intervalDays);
          await PMPlan.updateOne({ _id: p._id }, { $set: { nextDueAt: next } });
        }
      }

      res.json({ created });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: "Failed to generate tasks" });
    }
  }
);

/* ----------------- Tasks ----------------- */

// List tasks
router.get("/tasks", requireAuth, async (req, res) => {
  try {
    const parsed = listTasksQuery.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid query", issues: parsed.error.issues });
    }
    const { machineId, status = "pending", limit = "50" } = parsed.data;
    const filter = {};

    if (machineId && mongoose.isValidObjectId(machineId))
      filter.machineId = machineId;
    if (status !== "all") filter.status = status;

    const rows = await PMTask.find(filter)
      .sort({ dueAt: 1, createdAt: -1 })
      .limit(Math.min(Number(limit), 200))
      .populate("machineId", "name location _id")
      .populate("completedBy", "name email _id")
      .lean();

    res.json({ tasks: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

// Complete / Skip via unified endpoint
router.patch("/tasks/:id/complete", requireAuth, async (req, res) => {
  try {
    const parsed = completeTaskBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { status, notes } = parsed.data;
    if (!["completed", "skipped"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const task = await PMTask.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.status = status;
    task.completedAt = new Date();
    task.completedBy = req.user?._id || req.userId || req.user;
    task.completionNotes = notes || "";
    await task.save();

    const populated = await PMTask.findById(task._id)
      .populate("machineId", "name location _id")
      .populate("completedBy", "name email _id")
      .lean();

    // AUDIT
    await recordAudit(req, {
      action: status === "completed" ? "pm.completed" : "pm.skipped",
      targetType: "PMTask",
      targetId: task._id,
      meta: { notes: task.completionNotes },
    });

    res.json({ task: populated });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// Alias /skip — already sets status=skipped
router.patch("/tasks/:id/skip", requireAuth, async (req, res) => {
  try {
    const task = await PMTask.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.status = "skipped";
    task.completedAt = new Date();
    task.completedBy = req.user?._id || req.userId || req.user;
    task.completionNotes = (req.body && req.body.notes) || "";
    await task.save();

    const populated = await PMTask.findById(task._id)
      .populate("machineId", "name location _id")
      .populate("completedBy", "name email _id")
      .lean();

    // AUDIT
    await recordAudit(req, {
      action: "pm.skipped",
      targetType: "PMTask",
      targetId: task._id,
      meta: { notes: task.completionNotes },
    });

    res.json({ task: populated });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Failed to skip task" });
  }
});

module.exports = router;
