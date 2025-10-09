const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const Cycle = require("../models/Cycle");
const Maintenance = require("../models/Maintenance");
const DeconLog = require("../models/DeconLog");
const ControlBI = require("../models/ControlBI");
const AuditLog = require("../models/AuditLog");
const { requireAuth, requireRole } = require("../middleware/auth");

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
  kind: z.enum([
    "cycles",
    "maintenance",
    "spores",
    "decon",
    "control",
    "transport",
    "fuel",
    "audit",
  ]),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  machineId: z.string().optional(),
  basis: z.enum(["incubated", "verified"]).optional(),
  clinic: z.string().optional(),
});

/* ----- shared report builder (headers + data) ----- */
async function buildReport(kind, { year, month, machineId, basis, clinic }) {
  const { start, end } = monthBoundsUTC(year, month);

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

    return {
      title: `Cycles — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
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
      "Washer Daily: R1(1-5)",
      "Washer Daily: R2(1-5)",
      "Washer Daily: Debris",
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
      const r1 = (d.rack1 || []).map(String).join("|");
      const r2 = (d.rack2 || []).map(String).join("|");
      const debris = d.debrisScreenCleaned ? "yes" : "";
      const dailyInit = d.initials || "";
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

    return {
      title: `Maintenance — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
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
      .sort(byVerified ? { "spore.verifiedAt": 1 } : { "spore.incubatedAt": 1 })
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
    return {
      title: `Spore BI — ${year}-${String(month).padStart(2, "0")} (${
        byVerified ? "Verified" : "Incubated"
      })`,
      header,
      data,
    };
  }

  if (kind === "decon") {
    const filter = { receivedAt: { $gte: start, $lt: end } };
    if (clinic && clinic.trim())
      filter.clinic = { $regex: clinic.trim(), $options: "i" };
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

    return {
      title: `Decontamination — ${year}-${String(month).padStart(2, "0")}${
        clinic ? " (" + clinic + ")" : ""
      }`,
      header,
      data,
    };
  }

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

    return {
      title: `Control BI — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
  }

  if (kind === "transport") {
    const TransportTrip = require("../models/TransportTrip");
    const rows = await TransportTrip.find({ date: { $gte: start, $lt: end } })
      .sort({ date: 1 })
      .lean();

    const header = [
      "Date",
      "Driver",
      "Destination",
      "Start Mileage",
      "Depart Time",
      "Return Time",
      "Return Mileage",
      "Wash/Gas",
      "Receipt Filed",
      "Reviewed Schedule",
      "Count Morning",
      "Count Return",
      "Count End of Day",
      "Copy Sheets Needed",
      "Gas Receipt Submitted",
      "Tech Signature",
      "Supervisor Signature",
      "Notes",
    ];

    const data = rows.map((r) => [
      r.date ? new Date(r.date).toISOString() : "",
      r.driver || "",
      r.destination || "",
      r.startMileage ?? "",
      r.departAt ? new Date(r.departAt).toISOString() : "",
      r.returnAt ? new Date(r.returnAt).toISOString() : "",
      r.returnMileage ?? "",
      r.washOrGas ? "yes" : "no",
      r.receiptFiled ? "yes" : "no",
      r.reviewedSchedule ? "yes" : "no",
      r.countTransportsMorning ? "yes" : "no",
      r.countTransportsReturn ? "yes" : "no",
      r.countTransportsEndOfDay ? "yes" : "no",
      r.copySheetsNeeded || "",
      r.gasReceiptSubmitted || "",
      r.techSignature || "",
      r.supervisorSignature || "",
      r.notes || "",
    ]);

    return {
      title: `Transport — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
  }

  if (kind === "fuel") {
    const FuelPurchase = require("../models/FuelPurchase");
    const rows = await FuelPurchase.find({ date: { $gte: start, $lt: end } })
      .sort({ date: 1 })
      .lean();

    const header = [
      "Date",
      "Mileage",
      "Price/Gallon",
      "Gallons",
      "Amount",
      "Vendor",
      "Signature",
      "Notes",
    ];

    const data = rows.map((r) => [
      r.date ? new Date(r.date).toISOString() : "",
      r.mileage ?? "",
      r.pricePerGallon ?? "",
      r.gallons ?? "",
      r.amount ?? "",
      r.vendor || "",
      r.signature || "",
      r.notes || "",
    ]);

    return {
      title: `Fuel — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
  }

  if (kind === "audit") {
    const rows = await AuditLog.find({
      createdAt: { $gte: start, $lt: end },
    })
      .sort({ createdAt: 1 })
      .populate("userId", "name email _id")
      .lean();

    const header = [
      "Timestamp",
      "User Name",
      "User Email",
      "Role",
      "Action",
      "Target Type",
      "Target ID",
      "IP",
      "User-Agent",
      "Meta (JSON)",
    ];

    const data = rows.map((r) => [
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.userId?.name || "",
      r.userEmail || r.userId?.email || "",
      r.role || "",
      r.action || "",
      r.targetType || "",
      r.targetId || "",
      r.ip || "",
      r.ua || "",
      r.meta ? JSON.stringify(r.meta) : "",
    ]);

    return {
      title: `Audit — ${year}-${String(month).padStart(2, "0")}`,
      header,
      data,
    };
  }

  throw new Error("Unsupported kind");
}

/* ------------ CSV (existing behavior) ------------ */
router.get(
  "/csv",
  requireAuth,
  (req, res, next) => {
    if (req.query.kind === "audit")
      return requireRole("supervisor")(req, res, next);
    next();
  },
  async (req, res) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) return res.status(400).send("Invalid query");

    try {
      const { title, header, data, year, month } = await buildReport(
        parsed.data.kind,
        parsed.data
      );
      const csv = rowsToCSV([header, ...data]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      const y = parsed.data.year;
      const m = String(parsed.data.month).padStart(2, "0");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${parsed.data.kind}-${y}-${m}.csv"`
      );
      return res.send(csv);
    } catch (e) {
      console.error(e);
      res.status(500).send("Report generation failed");
    }
  }
);

/* ------------ PDF (new) ------------ */
router.get(
  "/pdf",
  requireAuth,
  (req, res, next) => {
    if (req.query.kind === "audit")
      return requireRole("supervisor")(req, res, next);
    next();
  },
  async (req, res) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) return res.status(400).send("Invalid query");

    try {
      const { kind } = parsed.data;
      const { title, header, data } = await buildReport(kind, parsed.data);

      // PDF
      const doc = new PDFDocument({ margin: 36, size: "LETTER" }); // ~8.5x11
      res.setHeader("Content-Type", "application/pdf");
      const y = parsed.data.year;
      const m = String(parsed.data.month).padStart(2, "0");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${kind}-${y}-${m}.pdf"`
      );
      doc.pipe(res);

      // Title
      doc.fontSize(16).text(title, { align: "left" });
      doc.moveDown(0.5);

      // Simple table
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = Math.max(60, Math.floor(pageWidth / header.length));

      // header row
      doc.fontSize(9).fillColor("#000");
      header.forEach((h, i) => {
        doc.text(h, doc.x + i * colWidth, doc.y, {
          width: colWidth,
          continued: false,
        });
      });
      doc.moveDown(0.5);
      doc
        .moveTo(doc.x, doc.y)
        .lineTo(doc.x + pageWidth, doc.y)
        .stroke();

      // body rows
      const startY = doc.y + 6;
      doc.y = startY;

      const rowHeight = 14;
      for (const row of data) {
        // auto page break
        if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
          doc.addPage();
        }
        row.forEach((cell, i) => {
          const text = cell == null ? "" : String(cell);
          doc.text(text, doc.x + i * colWidth, doc.y, {
            width: colWidth,
            continued: false,
          });
        });
        doc.y += rowHeight - 10; // small spacing
      }

      doc.end();
    } catch (e) {
      console.error(e);
      res.status(500).send("PDF generation failed");
    }
  }
);

module.exports = router;
