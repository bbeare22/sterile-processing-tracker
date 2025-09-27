const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");
const Cycle = require("../models/Cycle");

const router = express.Router();

/** utils */
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCSV(rows, header) {
  const lines = [];
  lines.push(header.map(csvEscape).join(","));
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n");
}
function monthRangeUTC(year, month) {
  // month: 1..12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // exclusive
  return { start, end };
}

/**
 * GET /api/reports/csv
 * Query:
 *   kind=spores            (only implemented kind for now)
 *   year=YYYY              (required)
 *   month=1..12            (required)
 *   basis=incubated|verified  (optional, default=incubated)
 *
 * Auth: requireAuth
 */
router.get("/csv", requireAuth, async (req, res) => {
  try {
    const kind = (req.query.kind || "").toLowerCase();
    if (kind !== "spores") {
      return res
        .status(400)
        .json({ error: "Unsupported kind (use kind=spores)" });
    }

    const year = Number(req.query.year);
    const month = Number(req.query.month);
    const basis = (req.query.basis || "incubated").toLowerCase(); // incubated | verified

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "Invalid year" });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid month" });
    }
    if (!["incubated", "verified"].includes(basis)) {
      return res.status(400).json({ error: "Invalid basis" });
    }

    const { start, end } = monthRangeUTC(year, month);

    // Build date filter by chosen basis
    const dateField =
      basis === "verified" ? "spore.verifiedAt" : "spore.incubatedAt";

    // Fetch cycles that have spores and a relevant date inside the month window
    const filter = {
      "spore.ran": true,
      [dateField]: { $gte: start, $lt: end },
    };

    const rows = await Cycle.find(filter)
      .sort({ [dateField]: 1 })
      .populate({ path: "machineId", select: "name location _id" })
      .lean();

    const header = [
      "Machine",
      "MachineLocation",
      "MachineId",
      "LoadNumber",
      "StartedAt",
      "CompletedAt",
      "Result",
      "SporeRan",
      "SporeWell",
      "SporeLot",
      "SporeExpireDate",
      "SporeIncubatorId",
      "SporeIncubatedAt",
      "SporeResult",
      "SporeVerifiedBy",
      "SporeVerifiedAt",
    ];

    const csvRows = rows.map((c) => {
      const sp = c.spore || {};
      return {
        Machine: c.machineId?.name || "",
        MachineLocation: c.machineId?.location || "",
        MachineId: c.machineId?._id || "",
        LoadNumber: c.loadNumber || "",
        StartedAt: c.startedAt ? new Date(c.startedAt).toISOString() : "",
        CompletedAt: c.completedAt ? new Date(c.completedAt).toISOString() : "",
        Result: c.result || "",
        SporeRan: sp.ran ? "yes" : "no",
        SporeWell: sp.well || "",
        SporeLot: sp.lot || "",
        SporeExpireDate: sp.expireDate
          ? new Date(sp.expireDate).toISOString()
          : "",
        SporeIncubatorId: sp.incubatorId || "",
        SporeIncubatedAt: sp.incubatedAt
          ? new Date(sp.incubatedAt).toISOString()
          : "",
        SporeResult: sp.result || "",
        SporeVerifiedBy: sp.verifiedBy || "",
        SporeVerifiedAt: sp.verifiedAt
          ? new Date(sp.verifiedAt).toISOString()
          : "",
      };
    });

    const csv = toCSV(csvRows, header);

    const fname = `spores-${year}-${String(month).padStart(
      2,
      "0"
    )}-${basis}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    return res.send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to build CSV" });
  }
});

module.exports = router;
