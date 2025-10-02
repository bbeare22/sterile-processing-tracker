const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");

const Cycle = require("../models/Cycle");
const Maintenance = require("../models/Maintenance");
const DeconLog = require("../models/DeconLog");
const ControlBI = require("../models/ControlBI");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* ------------ helpers ------------ */
function monthBoundsUTC(year, month /* 1..12 */) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function rowsToCSV(rows) {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

/* ------------ validation ------------ */
const Query = z.object({
  kind: z.enum(["cycles", "maintenance", "spores", "decon", "control"]),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  // optional filters per kind:
  machineId: z.string().optional(),
  // spores-only:
  basis: z.enum(["incubated", "verified"]).optional(),
  // decon-only:
  clinic: z.string().optional(),
});

/* ------------ GET /api/reports/csv ------------ */
router.get("/csv", requireAuth, async (req, res) => {
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).send("Invalid query");
  }
  const { kind, year, month, machineId, basis, clinic } = parsed.data;
  const { start, end } = monthBoundsUTC(year, month);

  try {
    if (kind === "cycles") {
      const filter = { startedAt: { $gte: start, $lt: end } };
      if (machineId && mongoose.isValidObjectId(machineId)) {
        filter.machineId = machineId;
      }
      const rows = await Cycle.find(filter)
        .sort({ startedAt: 1 })
        .populate("machineId", "name _id")
        .lean();

      const header = [
        "Machine",
        "Load #",
        "Started",
        "Completed",
        "Result",
        "Items",
        "Clinic/Dept",
        "Load Staff",
        "Unload Staff",
        "Sterile & Dry (min)",
        "Max Temp/Pressure",
        "Spore Ran",
        "Spore Well",
        "Spore Lot",
        "Spore Exp",
        "Spore Incubated",
        "Spore Result",
        "Verified By",
        "Verified At",
      ];

      const data = rows.map((c) => [
        c.machineId?.name || "",
        c.loadNumber || "",
        c.startedAt ? new Date(c.startedAt).toISOString() : "",
        c.completedAt ? new Date(c.completedAt).toISOString() : "",
        c.result || "",
        c.items || "",
        c.clinicName || "",
        c.loadStaff || "",
        c.unloadStaff || "",
        c.sterileDryMinutes ?? "",
        c.maxTempPressure || "",
        c.spore?.ran ? "yes" : "no",
        c.spore?.well || "",
        c.spore?.lot || "",
        c.spore?.expireDate ? new Date(c.spore.expireDate).toISOString() : "",
        c.spore?.incubatedAt ? new Date(c.spore.incubatedAt).toISOString() : "",
        c.spore?.result || "",
        c.spore?.verifiedBy || "",
        c.spore?.verifiedAt ? new Date(c.spore.verifiedAt).toISOString() : "",
      ]);

      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cycles-${year}-${String(month).padStart(
          2,
          "0"
        )}.csv"`
      );
      return res.send(csv);
    }

    if (kind === "maintenance") {
      const filter = { performedAt: { $gte: start, $lt: end } };
      if (machineId && mongoose.isValidObjectId(machineId)) {
        filter.machineId = machineId;
      }
      const rows = await Maintenance.find(filter)
        .sort({ performedAt: 1 })
        .populate("machineId", "name _id type")
        .populate("createdBy", "name email _id")
        .lean();

      const header = [
        "Machine",
        "Type",
        "Performed At",
        "Volume (mL)",
        "Notes",
        "Performed By (initials)",
        // flattened helpers
        "Washer Daily: R1(1-5)",
        "Washer Daily: R2(1-5)",
        "Washer Daily: Debris Screen",
        "Washer Daily: Initials",
        "Washer Weekly: Spray Arms",
        "Washer Weekly: Tubing/Float",
        "Washer Weekly: Door Seal",
        "Washer Weekly: Decon/Descale",
        "Washer Weekly: Initials",
      ];

      const getInitials = (name) =>
        (name || "")
          .split(/\s+/)
          .map((s) => s[0])
          .join("")
          .toUpperCase();

      const data = rows.map((r) => {
        const d = r.details || {};
        // daily
        const r1 = (d.rack1 || []).map(String).join("|");
        const r2 = (d.rack2 || []).map(String).join("|");
        const debris = d.debrisScreenCleaned ? "yes" : "";
        const dailyInit = d.initials || "";

        // weekly
        const w = d.weekly || {};
        const wSpray = w.sprayArms ? "yes" : "";
        const wTube = w.tubingFloat ? "yes" : "";
        const wSeal = w.doorSeal ? "yes" : "";
        const wDecon = w.deconDescale ? "yes" : "";
        const weeklyInit = w.initials || "";

        return [
          r.machineId?.name || "",
          r.type || "",
          r.performedAt ? new Date(r.performedAt).toISOString() : "",
          r.volumeUsedMl ?? "",
          r.notes || "",
          getInitials(r.createdBy?.name || ""),
          r.type === "washer_daily_verify" ? r1 : "",
          r.type === "washer_daily_verify" ? r2 : "",
          r.type === "washer_daily_verify" ? debris : "",
          r.type === "washer_daily_verify" ? dailyInit : "",
          r.type === "washer_weekly_tasks" ? wSpray : "",
          r.type === "washer_weekly_tasks" ? wTube : "",
          r.type === "washer_weekly_tasks" ? wSeal : "",
          r.type === "washer_weekly_tasks" ? wDecon : "",
          r.type === "washer_weekly_tasks" ? weeklyInit : "",
        ];
      });

      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="maintenance-${year}-${String(month).padStart(
          2,
          "0"
        )}.csv"`
      );
      return res.send(csv);
    }

    if (kind === "spores") {
      const byVerified = basis === "verified";
      const filter = byVerified
        ? { "spore.verifiedAt": { $gte: start, $lt: end } }
        : { "spore.incubatedAt": { $gte: start, $lt: end } };

      const rows = await Cycle.find({
        "spore.ran": true,
        ...filter,
      })
        .sort(
          byVerified ? { "spore.verifiedAt": 1 } : { "spore.incubatedAt": 1 }
        )
        .populate("machineId", "name location _id")
        .lean();

      const header = [
        "Machine",
        "Location",
        "Load #",
        "Well",
        "Lot",
        "Incubated",
        "Result",
        "Verified By",
        "Verified At",
      ];
      const data = rows.map((r) => [
        r.machineId?.name || "",
        r.machineId?.location || "",
        r.loadNumber || "",
        r.spore?.well || "",
        r.spore?.lot || "",
        r.spore?.incubatedAt ? new Date(r.spore.incubatedAt).toISOString() : "",
        r.spore?.result || "",
        r.spore?.verifiedBy || "",
        r.spore?.verifiedAt ? new Date(r.spore.verifiedAt).toISOString() : "",
      ]);
      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="spores-${year}-${String(month).padStart(
          2,
          "0"
        )}-${byVerified ? "verified" : "incubated"}.csv"`
      );
      return res.send(csv);
    }

    if (kind === "decon") {
      const filter = { receivedAt: { $gte: start, $lt: end } };
      if (clinic && clinic.trim()) {
        filter.clinic = { $regex: clinic.trim(), $options: "i" };
      }
      const rows = await DeconLog.find(filter).sort({ receivedAt: 1 }).lean();

      const dental = [
        ["basic", "Basic"],
        ["oralSurgery", "Oral Surgery"],
        ["srp", "SRP"],
        ["ultrasonic", "Ultrasonic"],
        ["restorative", "Restorative"],
        ["endo", "Endo"],
        ["denture", "Denture"],
        ["rubberDam", "Rubber dam"],
        ["xcp", "XCP"],
      ];
      const womens = [
        ["culpo", "Culpo"],
        ["scissors", "Scissors"],
        ["speculum", "Speculum"],
        ["tenaculum", "Tenaculum"],
        ["spongeForceps", "Sponge forceps"],
        ["dilator", "Dilator"],
        ["bozeman", "Bozeman"],
        ["pessary", "Pessary"],
        ["iud", "IUD"],
        ["misc", "Misc."],
      ];

      const header = [
        "Clinic",
        "Received At",
        "Sent Out At",
        "Verified In By",
        "Verified Out By",
        "Notes",
        ...dental.flatMap(([, label]) => [`${label} IN`, `${label} OUT`]),
        ...womens.flatMap(([, label]) => [`${label} IN`, `${label} OUT`]),
      ];

      const pair = (obj, key) => {
        const v = (obj || {})[key] || {};
        return [Number(v.in || 0), Number(v.out || 0)];
      };

      const data = rows.map((r) => [
        r.clinic || "",
        r.receivedAt ? new Date(r.receivedAt).toISOString() : "",
        r.sentAt ? new Date(r.sentAt).toISOString() : "",
        r.verifiedInBy || "",
        r.verifiedOutBy || "",
        r.notes || "",
        ...dental.flatMap(([k]) => pair(r.sets, k)),
        ...womens.flatMap(([k]) => pair(r.womens, k)),
      ]);

      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="decon-${year}-${String(month).padStart(2, "0")}${
          clinic ? "-" + clinic : ""
        }.csv"`
      );
      return res.send(csv);
    }

    // ← NEW: Control BI export (incubated within month)
    if (kind === "control") {
      const rows = await ControlBI.find({
        incubatedAt: { $gte: start, $lt: end },
      })
        .sort({ incubatedAt: 1 })
        .lean();

      const header = [
        "Incubator ID",
        "Well",
        "Lot",
        "Incubated At",
        "Result",
        "Verified By",
        "Verified At",
        "Notes",
      ];

      const data = rows.map((r) => [
        r.incubatorId || "",
        r.well || "",
        r.lot || "",
        r.incubatedAt ? new Date(r.incubatedAt).toISOString() : "",
        r.result || "",
        r.verifiedBy || "",
        r.verifiedAt ? new Date(r.verifiedAt).toISOString() : "",
        r.notes || "",
      ]);

      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="control-${year}-${String(month).padStart(
          2,
          "0"
        )}.csv"`
      );
      return res.send(csv);
    }

    return res.status(400).send("Unsupported kind");
  } catch (e) {
    console.error(e);
    res.status(500).send("Report generation failed");
  }
});

module.exports = router;
