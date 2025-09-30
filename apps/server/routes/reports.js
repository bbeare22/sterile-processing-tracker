const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const Maintenance = require("../models/Maintenance");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* ----------------- validation ----------------- */
const baseQuery = z.object({
  kind: z.enum(["spores", "cycles", "maintenance"]),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  machineId: z.string().optional(), // optional per-machine export
  // spores-only
  basis: z.enum(["incubated", "verified"]).optional(),
});

/* ----------------- helpers ----------------- */
function monthRangeUTC(year, month /* 1..12 */) {
  // start inclusive, end exclusive
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

function sendCSV(res, filename, rows) {
  const csv = toCSV(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

/* ----------------- route ----------------- */

router.get("/csv", requireAuth, async (req, res) => {
  const parsed = baseQuery.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query", issues: parsed.error.issues });
  }
  const { kind, year, month, machineId, basis } = parsed.data;
  const { start, end } = monthRangeUTC(year, month);

  try {
    // optional machine filter
    const machineFilter =
      machineId && mongoose.isValidObjectId(machineId) ? { machineId } : {};

    if (kind === "spores") {
      // Which date to filter on?
      // default to incubated if not provided (client passes it explicitly)
      const dateField =
        basis === "verified" ? "spore.verifiedAt" : "spore.incubatedAt";
      const filter = {
        ...machineFilter,
        "spore.ran": true,
        [dateField]: { $gte: start, $lt: end },
      };

      const rows = await Cycle.find(filter)
        .sort({ [dateField]: 1 })
        .populate("machineId", "name location _id")
        .lean();

      const out = rows.map((r) => ({
        Machine: r.machineId?.name || "",
        Location: r.machineId?.location || "",
        LoadNumber: r.loadNumber || "",
        StartedAt: r.startedAt ? new Date(r.startedAt).toISOString() : "",
        SporeWell: r.spore?.well || "",
        SporeLot: r.spore?.lot || "",
        IncubatedAt: r.spore?.incubatedAt
          ? new Date(r.spore.incubatedAt).toISOString()
          : "",
        Result: r.spore?.result || "",
        VerifiedBy: r.spore?.verifiedBy || "",
        VerifiedAt: r.spore?.verifiedAt
          ? new Date(r.spore.verifiedAt).toISOString()
          : "",
      }));

      const fname = `spores-${year}-${String(month).padStart(2, "0")}-${
        basis || "incubated"
      }.csv`;
      return sendCSV(res, fname, out);
    }

    if (kind === "cycles") {
      // month by startedAt
      const filter = {
        ...machineFilter,
        startedAt: { $gte: start, $lt: end },
      };

      const rows = await Cycle.find(filter)
        .sort({ startedAt: 1 })
        .populate("machineId", "name location _id")
        .lean();

      const out = rows.map((c) => ({
        Machine: c.machineId?.name || "",
        Location: c.machineId?.location || "",
        LoadNumber: c.loadNumber || "",
        StartedAt: c.startedAt ? new Date(c.startedAt).toISOString() : "",
        CompletedAt: c.completedAt ? new Date(c.completedAt).toISOString() : "",
        Result: c.result || "",
        Items: c.items || "",
        Clinic: c.clinicName || "",
        LoadStaff: c.loadStaff || "",
        UnloadStaff: c.unloadStaff || "",
        SterileDryMinutes: c.sterileDryMinutes ?? "",
        MaxTempPressure: c.maxTempPressure || "",
        SporeRan: c.spore?.ran ? "yes" : "no",
        SporeWell: c.spore?.well || "",
        SporeLot: c.spore?.lot || "",
        SporeIncubatedAt: c.spore?.incubatedAt
          ? new Date(c.spore.incubatedAt).toISOString()
          : "",
        SporeResult: c.spore?.result || "",
        SporeVerifiedBy: c.spore?.verifiedBy || "",
        SporeVerifiedAt: c.spore?.verifiedAt
          ? new Date(c.spore.verifiedAt).toISOString()
          : "",
        Notes: c.notes || "",
      }));

      const fname = `cycles-${year}-${String(month).padStart(2, "0")}${
        machineId ? `-${machineId}` : ""
      }.csv`;
      return sendCSV(res, fname, out);
    }

    if (kind === "maintenance") {
      // month by performedAt
      const filter = {
        ...machineFilter,
        performedAt: { $gte: start, $lt: end },
      };

      const rows = await Maintenance.find(filter)
        .sort({ performedAt: 1 })
        .populate("machineId", "name location _id")
        .populate("createdBy", "name email _id")
        .lean();

      const out = rows.map((r) => ({
        Machine: r.machineId?.name || "",
        Location: r.machineId?.location || "",
        Type: r.type,
        PerformedAt: r.performedAt ? new Date(r.performedAt).toISOString() : "",
        VolumeMl: r.volumeUsedMl ?? "",
        Notes: r.notes || "",
        PerformedBy: r.createdBy?.name || "", // initials or name depending on your User model
      }));

      const fname = `maintenance-${year}-${String(month).padStart(2, "0")}${
        machineId ? `-${machineId}` : ""
      }.csv`;
      return sendCSV(res, fname, out);
    }

    return res.status(400).json({ error: "Unsupported kind" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to build CSV" });
  }
});

module.exports = router;
