// apps/server/routes/reports.js
const express = require("express");
const PDFDocument = require("pdfkit");
const { requireAuth } = require("../middleware/auth");

/* ---------------- safe requires for your exact filenames ---------------- */
function safeRequire(p) {
  try {
    return require(p);
  } catch {
    return null;
  }
}

const Machine = safeRequire("../models/Machine");
const Maintenance =
  safeRequire("../models/maintenance") || safeRequire("../models/Maintenance");
const Cycle = safeRequire("../models/Cycle");
const ControlBI = safeRequire("../models/ControlBI");
const DeconLog = safeRequire("../models/DeconLog");
const TransportTrip = safeRequire("../models/TransportTrip");
const FuelPurchase = safeRequire("../models/FuelPurchase");
const AuditLog =
  safeRequire("../models/AuditLog") || safeRequire("../models/Audit"); // optional
const User = safeRequire("../models/User");

const router = express.Router();
const OID = /^[a-f\d]{24}$/i;

/* ---------------- tiny utils ---------------- */
const s = (x) =>
  x == null
    ? ""
    : typeof x === "string"
    ? x
    : typeof x === "number"
    ? String(x)
    : typeof x === "boolean"
    ? x
      ? "true"
      : "false"
    : "";

function prefDate(row, fields) {
  for (const f of fields) {
    const v = row?.[f];
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
function fmtDateFrom(row, fields) {
  const d = prefDate(row, fields);
  return d ? d.toLocaleString() : "—";
}

const title = (doc, t) => {
  doc.moveDown(0.25);
  doc.fontSize(14).text(t, { underline: true }).moveDown(0.4);
};
const bullet = (doc, t) => doc.fontSize(11).text(`• ${t}`);

/* ---------------- user + machine name resolution ---------------- */
function collectUserIds(row, into) {
  const m = row?.meta || {};
  const fields = [
    "createdBy",
    "user",
    "userId",
    "actor",
    "actorId",
    "updatedBy",
    "performedBy",
    "staff",
    "staffId",
  ];
  for (const f of fields) {
    const v = row?.[f] ?? m?.[f];
    if (!v) continue;
    if (typeof v === "object" && v._id && OID.test(String(v._id)))
      into.add(String(v._id));
    else if (typeof v === "string" && OID.test(v)) into.add(v);
  }
}
function collectMachineIds(row, into) {
  const m = row?.meta || {};
  const fields = ["machineId", "machine", "sterilizer", "device"];
  for (const f of fields) {
    const v = row?.[f] ?? m?.[f];
    if (!v) continue;
    if (typeof v === "object" && v._id && OID.test(String(v._id)))
      into.add(String(v._id));
    else if (typeof v === "string" && OID.test(v)) into.add(v);
  }
}

async function buildUserMap(data) {
  const map = Object.create(null);
  if (!User) return map;
  const ids = new Set();
  const arrays = [
    data.maintenance,
    data.cycles,
    data.controls,
    data.deconLogs,
    data.trips,
    data.fuel,
    data.audits,
  ];
  arrays.forEach(
    (arr) => Array.isArray(arr) && arr.forEach((r) => collectUserIds(r, ids))
  );
  if (!ids.size) return map;
  const users = await User.find(
    { _id: { $in: [...ids] } },
    "name email"
  ).lean();
  users.forEach((u) => {
    map[String(u._id)] = u.name || u.email || String(u._id);
  });
  return map;
}
async function buildMachineMap(data) {
  const map = Object.create(null);
  if (!Machine) return map;
  const ids = new Set();
  const arrays = [data.maintenance, data.cycles, data.controls, data.audits];
  arrays.forEach(
    (arr) => Array.isArray(arr) && arr.forEach((r) => collectMachineIds(r, ids))
  );
  if (!ids.size) return map;
  const machines = await Machine.find(
    { _id: { $in: [...ids] } },
    "name model"
  ).lean();
  machines.forEach((m) => {
    map[String(m._id)] = m.name || m.model || String(m._id);
  });
  return map;
}

function who(row, userMap) {
  const m = row?.meta || {};
  const inline =
    row?.userName ||
    row?.actorName ||
    row?.performedByName ||
    row?.verifiedBy ||
    row?.loadStaff ||
    row?.unloadStaff ||
    m.userName ||
    m.actorName ||
    m.performedByName;
  if (inline) return inline;
  const fields = [
    "createdBy",
    "user",
    "userId",
    "actor",
    "actorId",
    "updatedBy",
    "performedBy",
    "staff",
    "staffId",
  ];
  for (const f of fields) {
    const v = row?.[f] ?? m?.[f];
    if (!v) continue;
    if (typeof v === "object" && v._id && userMap[String(v._id)])
      return userMap[String(v._id)];
    if (typeof v === "string" && userMap[v]) return userMap[v];
  }
  for (const f of fields) {
    const v = row?.[f] ?? m?.[f];
    if (typeof v === "string") return v;
    if (typeof v === "object" && v?._id) return String(v._id);
  }
  return "Unknown";
}

function machineLabel(row, machineMap) {
  const m = row?.meta || {};
  const fields = ["machineId", "machine", "sterilizer", "device"];
  for (const f of fields) {
    const v = row?.[f] ?? m?.[f];
    if (!v) continue;
    if (typeof v === "object" && v._id && machineMap[String(v._id)])
      return machineMap[String(v._id)];
    if (typeof v === "string" && machineMap[v]) return machineMap[v];
    if (typeof v === "string" && !OID.test(v)) return v;
  }
  return null;
}

/* ---------------- domain helpers ---------------- */
function cycleLoadNumber(row) {
  const m = row?.meta || {};
  const cands = [row.loadNumber, m.loadNumber, m.load, m.loadNo, m.lot];
  for (const v of cands) if (v || v === 0 || v === "") return String(v);
  return null;
}

/* Decon totals: sum every sets.* and womens.* in/out cell */
function deconTotals(row) {
  let inTotal = 0,
    outTotal = 0;
  const add = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const cell = obj[k];
      if (cell && typeof cell === "object") {
        const inn = Number(cell.in ?? 0);
        const out = Number(cell.out ?? 0);
        if (!Number.isNaN(inn)) inTotal += inn;
        if (!Number.isNaN(out)) outTotal += out;
      }
    }
  };
  add(row.sets);
  add(row.womens);
  return { inTotal, outTotal };
}

function auditTargetLabel(row, machineMap) {
  const tType = row.targetType || row.meta?.targetType;
  const tId = row.targetId || row.meta?.targetId;
  const mach = machineLabel(row, machineMap);
  const m = row.meta || {};
  const load = m.loadNumber || m.load || m.loadNo || m.lot || null;
  const result = m.result || m.cycleResult || m.controlResult || null;

  if (tType === "Cycle") {
    return [
      "Cycle",
      result || null,
      mach ? `Machine: ${mach}` : null,
      load ? `Load #: ${load}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
  }
  if (tType === "ControlBI" || tType === "Control") {
    return ["ControlBI", result || null, mach ? `Machine: ${mach}` : null]
      .filter(Boolean)
      .join(" — ");
  }
  if (tType === "Maintenance") {
    return ["Maintenance", m.type || null, mach ? `Machine: ${mach}` : null]
      .filter(Boolean)
      .join(" — ");
  }
  if (tType === "Machine")
    return mach
      ? `Machine: ${mach}`
      : tId
      ? `Machine(${String(tId).slice(0, 6)})`
      : "Machine";
  if (tType) return tId ? `${tType}(${String(tId).slice(0, 6)})` : tType;
  return mach || (tId ? `(${String(tId).slice(0, 6)})` : "");
}

/* ---------------- data fetch (filter by createdAt for stability) ---------------- */
async function fetchMonthlyData(start, end) {
  const out = { counts: {} };

  if (Machine) {
    out.machines = await Machine.find(
      {},
      { name: 1, model: 1, type: 1, location: 1 }
    )
      .sort({ name: 1 })
      .lean();
    out.counts.machines = await Machine.countDocuments();
  }

  if (Maintenance) {
    out.maintenance = await Maintenance.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        machineId: 1,
        type: 1,
        performedAt: 1,
        notes: 1,
        details: 1,
        createdBy: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.maintenance = await Maintenance.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (Cycle) {
    out.cycles = await Cycle.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        machineId: 1,
        machineType: 1,
        startedAt: 1,
        completedAt: 1,
        loadNumber: 1,
        result: 1,
        items: 1,
        notes: 1,
        loadStaff: 1,
        unloadStaff: 1,
        createdBy: 1,
        createdAt: 1,
        spore: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.cycles = await Cycle.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (ControlBI) {
    out.controls = await ControlBI.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        incubatorId: 1,
        lot: 1,
        well: 1,
        incubatedAt: 1,
        verifiedAt: 1,
        result: 1,
        verifiedBy: 1,
        notes: 1,
        createdBy: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.controls = await ControlBI.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (DeconLog) {
    out.deconLogs = await DeconLog.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        clinic: 1,
        receivedAt: 1,
        sentAt: 1,
        verifiedInBy: 1,
        verifiedOutBy: 1,
        sets: 1,
        womens: 1,
        notes: 1,
        createdBy: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.deconLogs = await DeconLog.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (TransportTrip) {
    out.trips = await TransportTrip.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        date: 1,
        driver: 1,
        destination: 1,
        startMileage: 1,
        returnMileage: 1,
        departAt: 1,
        returnAt: 1,
        washOrGas: 1,
        receiptFiled: 1,
        notes: 1,
        createdBy: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.trips = await TransportTrip.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (FuelPurchase) {
    out.fuel = await FuelPurchase.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        date: 1,
        mileage: 1,
        pricePerGallon: 1,
        gallons: 1,
        amount: 1,
        vendor: 1,
        signature: 1,
        notes: 1,
        createdBy: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    out.counts.fuel = await FuelPurchase.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  if (AuditLog) {
    out.audits = await AuditLog.find(
      { createdAt: { $gte: start, $lt: end } },
      {
        action: 1,
        createdAt: 1,
        createdBy: 1,
        user: 1,
        userId: 1,
        actor: 1,
        actorId: 1,
        targetType: 1,
        targetId: 1,
        meta: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    out.counts.audits = await AuditLog.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  out.userMap = await buildUserMap(out);
  out.machineMap = await buildMachineMap(out);
  return out;
}

/* ---------------- PDF builder ---------------- */
function buildPdf({ y, m, data }) {
  const userMap = data.userMap || {};
  const machineMap = data.machineMap || {};

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks = [];
    doc.on("data", (b) => chunks.push(b));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header
    doc.fontSize(18).text("Sterile Processing — Monthly Report").moveDown(0.2);
    doc
      .fontSize(12)
      .text(`Period: ${y}-${String(m).padStart(2, "0")}`, { continued: true })
      .text(`   Generated: ${new Date().toLocaleString()}`)
      .moveDown(0.8);

    // Summary
    title(doc, "Summary");
    const c = data.counts || {};
    [
      ["Machines (total in system)", c.machines],
      ["Maintenance entries (this month)", c.maintenance],
      ["Cycles logged (this month)", c.cycles],
      ["Control BI entries (this month)", c.controls],
      ["Decontamination records (this month)", c.deconLogs],
      ["Transport trips (this month)", c.trips],
      ["Fuel purchase entries (this month)", c.fuel],
      ["Audit events (this month)", c.audits],
    ].forEach(([k, v]) => (v === undefined ? null : bullet(doc, `${k}: ${v}`)));

    // Machines
    if (data.machines) {
      title(doc, "Machines");
      if (!data.machines.length) bullet(doc, "No machines found.");
      data.machines.slice(0, 70).forEach((mRow) => {
        const line =
          `${s(mRow.name)}` +
          (mRow.model ? ` — ${s(mRow.model)}` : "") +
          (mRow.location ? ` — ${s(mRow.location)}` : "");
        bullet(doc, line);
      });
    }

    // Maintenance
    if (data.maintenance) {
      title(doc, "Maintenance (latest 30)");
      if (!data.maintenance.length)
        bullet(doc, "No maintenance entries in this period.");
      data.maintenance.forEach((r) => {
        const machine = machineLabel(r, machineMap);
        const when = fmtDateFrom(r, ["performedAt", "createdAt"]);
        const line =
          `${when} — ${s(r.type)}` +
          (machine ? ` — Machine: ${machine}` : "") +
          (r.notes ? ` — ${s(r.notes)}` : "") +
          ` — by ${who(r, userMap)}`;
        bullet(doc, line);
      });
    }

    // Cycles
    if (data.cycles) {
      title(doc, "Cycles (latest 30)");
      if (!data.cycles.length) bullet(doc, "No cycles logged in this period.");
      data.cycles.forEach((r) => {
        const machine = machineLabel(r, machineMap);
        const when = fmtDateFrom(r, ["completedAt", "startedAt", "createdAt"]);
        const loadNum = cycleLoadNumber(r);
        const line =
          `${when} — Result: ${s(r.result)}` +
          (r.machineType ? ` — Type: ${s(r.machineType)}` : "") +
          (machine ? ` — Machine: ${machine}` : "") +
          (loadNum ? ` — Load #: ${loadNum}` : "") +
          (r.items ? ` — Items: ${s(r.items)}` : "") +
          ` — by ${who(r, userMap)}`;
        bullet(doc, line);
      });
    }

    // Control BI
    if (data.controls) {
      title(doc, "Control BIs (latest 30)");
      if (!data.controls.length)
        bullet(doc, "No control BI entries in this period.");
      data.controls.forEach((r) => {
        const when = fmtDateFrom(r, ["verifiedAt", "incubatedAt", "createdAt"]);
        const bits = [
          `${when} — Result: ${s(r.result) || "N/A"}`,
          r.lot ? `Lot: ${s(r.lot)}` : null,
          r.well ? `Well: ${s(r.well)}` : null,
          r.verifiedBy ? `by ${s(r.verifiedBy)}` : `by ${who(r, userMap)}`,
        ]
          .filter(Boolean)
          .join(" — ");
        bullet(doc, bits);
      });
    }

    // Decontamination
    if (data.deconLogs) {
      title(doc, "Decontamination (latest 30)");
      if (!data.deconLogs.length)
        bullet(doc, "No decontamination records in this period.");
      data.deconLogs.forEach((r) => {
        const when = fmtDateFrom(r, ["receivedAt", "createdAt"]);
        const { inTotal, outTotal } = deconTotals(r);
        const parts = [
          when,
          r.clinic ? `Clinic: ${s(r.clinic)}` : null,
          inTotal || outTotal ? `In: ${inTotal} — Out: ${outTotal}` : null,
          r.notes ? s(r.notes) : null,
          `by ${who(r, userMap)}`,
        ].filter(Boolean);
        bullet(doc, parts.join(" — "));
      });
    }

    // Transport trips
    if (data.trips) {
      title(doc, "Transport Trips (latest 30)");
      if (!data.trips.length) bullet(doc, "No transport trips in this period.");
      data.trips.forEach((r) => {
        const when = fmtDateFrom(r, ["date", "departAt", "createdAt"]);
        const miles =
          r.startMileage != null && r.returnMileage != null
            ? `Miles: ${Number(r.returnMileage) - Number(r.startMileage)}`
            : null;
        const line = [
          when,
          r.destination ? `Destination: ${s(r.destination)}` : null,
          miles,
          r.notes ? s(r.notes) : null,
          `by ${who(r, userMap)}`,
        ]
          .filter(Boolean)
          .join(" — ");
        bullet(doc, line);
      });
    }

    // Fuel purchases (optional)
    if (data.fuel) {
      title(doc, "Fuel Purchases (latest 30)");
      if (!data.fuel.length) bullet(doc, "No fuel entries in this period.");
      data.fuel.forEach((r) => {
        const when = fmtDateFrom(r, ["date", "createdAt"]);
        const line = [
          when,
          r.vendor ? `Vendor: ${s(r.vendor)}` : null,
          r.gallons != null ? `Gallons: ${r.gallons}` : null,
          r.pricePerGallon != null ? `$/gal: ${r.pricePerGallon}` : null,
          r.amount != null ? `Amount: ${r.amount}` : null,
          `by ${who(r, userMap)}`,
        ]
          .filter(Boolean)
          .join(" — ");
        bullet(doc, line);
      });
    }

    // Audits (if present)
    if (data.audits) {
      title(doc, "Audit Events (latest 30)");
      if (!data.audits.length) bullet(doc, "No audit events in this period.");
      data.audits.forEach((row) => {
        const when = fmtDateFrom(row, ["createdAt"]);
        const actor = who(row, userMap);
        const tgt = auditTargetLabel(row, machineMap);
        bullet(
          doc,
          `${when} — ${row.action || "event"} by ${actor}${
            tgt ? ` on ${tgt}` : ""
          }`
        );
      });
    }

    doc.end();
  });
}

/* ---------------- route ---------------- */
router.get("/monthly", requireAuth, async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "Invalid year or month." });
    }

    // Use UTC month range; fetch by createdAt for stability
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    const data = await fetchMonthlyData(start, end);
    const buffer = await buildPdf({ y, m, data });

    const filename = `spt-report-${y}-${String(m).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(buffer.length));
    res.status(200).end(buffer);
  } catch (err) {
    console.error("Monthly report error:", err?.message, err?.stack);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

module.exports = router;
