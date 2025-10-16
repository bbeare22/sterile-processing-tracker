const express = require("express");
const PDFDocument = require("pdfkit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* ---------------- safe requires ---------------- */
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
const User = safeRequire("../models/User");

const OID = /^[a-f\d]{24}$/i;

/* ---------------- tiny utils ---------------- */
function monthRangeUTC(y, m) {
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

function toCSV(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  const BOM = "\uFEFF";
  if (arr.length === 0) return BOM;

  const headerSet = new Set();
  for (const r of arr) Object.keys(r || {}).forEach((k) => headerSet.add(k));
  const headers = Array.from(headerSet);

  const esc = (val) => {
    if (val == null) return "";
    const str = String(val);
    const needsQuotes = /[",\n\r]/.test(str);
    const out = str.replace(/"/g, '""');
    return needsQuotes ? `"${out}"` : out;
  };

  const lines = [];
  lines.push(headers.map(esc).join(","));
  for (const r of arr) lines.push(headers.map((h) => esc(r?.[h])).join(","));
  return BOM + lines.join("\n");
}

/* ---------------- friendly labels ---------------- */

async function buildMachineMap() {
  const map = Object.create(null);
  if (!Machine) return map;
  const machines = await Machine.find({}, { name: 1 }).lean();
  for (const m of machines)
    map[String(m._id)] = m.name || String(m._id).slice(0, 6);
  return map;
}

function machineName(row, machineMap) {
  const m = row?.machineId || row?.machine || row?.meta?.machineId;
  if (!m) return "";
  if (typeof m === "object" && m._id && machineMap[String(m._id)])
    return machineMap[String(m._id)];
  if (typeof m === "string" && machineMap[m]) return machineMap[m];
  if (typeof m === "object" && m.name) return m.name;
  return "";
}

/**
 * Build a map of userId -> INITIALS (e.g., "BB").
 * Priority: explicit user.initials -> initials from name -> displayName -> username -> email localpart.
 */
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
    data.fuels,
  ].filter(Boolean);

  for (const arr of arrays) {
    for (const row of arr) {
      const fields = [
        "createdBy",
        "performedBy", // defensive
        "loadStaff",
        "unloadStaff",
        "verifiedInBy",
        "verifiedOutBy",
        "verifiedBy",
      ];
      for (const f of fields) {
        const v = row?.[f] || row?.meta?.[f];
        if (v && typeof v === "object" && v._id && OID.test(String(v._id))) {
          ids.add(String(v._id));
        } else if (typeof v === "string" && OID.test(v)) {
          ids.add(v);
        }
      }
    }
  }
  if (ids.size === 0) return map;

  // NOTE: include 'name' so we can derive "BB" from "Brett Beare"
  const users = await User.find(
    { _id: { $in: Array.from(ids) } },
    {
      name: 1,
      firstName: 1,
      lastName: 1,
      initials: 1,
      displayName: 1,
      username: 1,
      email: 1,
    }
  ).lean();

  const mkInitialsFromParts = (src) => {
    if (!src) return "";
    const parts = String(src)
      .replace(/[^a-zA-Z0-9_. -]/g, " ")
      .split(/[\s._-]+/)
      .filter(Boolean);
    const letters = parts.map((p) => p[0]).filter(Boolean);
    return letters.slice(0, 3).join("").toUpperCase();
  };

  for (const u of users) {
    const name =
      (u.name || "").trim() ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim();

    // Always store INITIALS in the map, not full name
    const initials =
      (u.initials && u.initials.trim().toUpperCase()) ||
      mkInitialsFromParts(name) ||
      mkInitialsFromParts(u.displayName) ||
      mkInitialsFromParts(u.username) ||
      mkInitialsFromParts((u.email || "").split("@")[0]) ||
      "—";

    map[String(u._id)] = initials;
  }

  return map;
}

function displayUser(fieldValue, userMap) {
  if (!fieldValue) return "";
  if (typeof fieldValue === "string" && userMap[fieldValue])
    return userMap[fieldValue];
  if (
    typeof fieldValue === "object" &&
    fieldValue._id &&
    userMap[String(fieldValue._id)]
  ) {
    return userMap[String(fieldValue._id)];
  }
  if (typeof fieldValue === "string") return fieldValue; // already human-entered initials
  return "—";
}

/* ---------------- date formatting ---------------- */

// For PDF (12-hour AM/PM)
function fmtLocal12(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  let hours = dt.getHours();
  const minutes = pad(dt.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}`;
  return `${date} ${hours}:${minutes} ${ampm}`;
}

// For CSV (ISO)
function fmtISO(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  return dt.toISOString();
}

/* ========================================================================== */
/* =                                   CSV                                  = */
/* ========================================================================== */

router.get("/csv", requireAuth, async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    const kind = String(req.query.kind || "")
      .toLowerCase()
      .trim();

    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "Invalid year or month." });
    }
    if (
      ![
        "spores",
        "control",
        "cycles",
        "maintenance",
        "decon",
        "transport",
        "fuel",
      ].includes(kind)
    ) {
      return res.status(400).json({ error: "Invalid kind." });
    }

    const { start, end } = monthRangeUTC(y, m);
    const machineId =
      req.query.machineId && /^[a-f\d]{24}$/i.test(req.query.machineId)
        ? req.query.machineId
        : null;

    const machineMap = await buildMachineMap();
    let rows = [];

    if (kind === "spores") {
      if (!Cycle)
        return res.status(501).json({ error: "Cycles model not available." });
      const docs = await Cycle.find({
        "spore.ran": true,
        startedAt: { $gte: start, $lt: end },
      })
        .sort({ startedAt: 1 })
        .populate("machineId", "name _id")
        .lean();

      rows = docs.map((c) => ({
        Date: fmtISO(c.startedAt),
        Machine: machineName(c, machineMap),
        LoadNumber: c.loadNumber || "",
        Result: c.spore?.result || "",
        Incubator: c.spore?.incubatorId || "",
        Lot: c.spore?.lot || "",
        Well: c.spore?.well || "",
        ReadAt: fmtISO(c.spore?.readAt || c.spore?.verifiedAt || c.completedAt),
        VerifiedBy: c.spore?.verifiedBy || "",
        ControlNegOK: c.spore?.controlNegativeOk ? "true" : "false",
        ControlPosOK: c.spore?.controlPositiveOk ? "true" : "false",
        Notes: c.notes || "",
      }));
    }

    if (kind === "control") {
      if (!ControlBI)
        return res
          .status(501)
          .json({ error: "ControlBI model not available." });
      const q = { incubatedAt: { $gte: start, $lt: end } };
      if (req.query.incubatorId)
        q.incubatorId = String(req.query.incubatorId || "");
      const docs = await ControlBI.find(q).sort({ incubatedAt: 1 }).lean();
      rows = docs.map((r) => ({
        IncubatedAt: fmtISO(r.incubatedAt),
        VerifiedAt: fmtISO(r.verifiedAt),
        Incubator: r.incubatorId || "",
        Lot: r.lot || "",
        Well: r.well || "",
        Result: r.result || "",
        VerifiedBy: r.verifiedBy || "",
        Notes: r.notes || "",
      }));
    }

    if (kind === "cycles") {
      if (!Cycle)
        return res.status(501).json({ error: "Cycle model not available." });
      const q = { startedAt: { $gte: start, $lt: end } };
      if (machineId) q.machineId = machineId;
      const docs = await Cycle.find(q)
        .sort({ startedAt: 1 })
        .populate("machineId", "name _id")
        .lean();

      rows = docs.map((c) => ({
        Date: fmtISO(c.startedAt),
        Machine: machineName(c, machineMap),
        MachineType: c.machineType || "",
        LoadNumber: c.loadNumber || "",
        Result: c.result || "",
        LoadedBy: c.loadStaff || "",
        UnloadedBy: c.unloadStaff || "",
        Items: c.items || "",
        Clinic: c.clinicName || "",
        Notes: c.notes || "",
        CompletedAt: fmtISO(c.completedAt),
      }));
    }

    if (kind === "maintenance") {
      if (!Maintenance)
        return res
          .status(501)
          .json({ error: "Maintenance model not available." });
      const q = { performedAt: { $gte: start, $lt: end } };
      if (machineId) q.machineId = machineId;
      const docs = await Maintenance.find(q)
        .sort({ performedAt: 1 })
        .populate("machineId", "name _id")
        .lean();

      const userMap = await buildUserMap({ maintenance: docs });

      rows = docs.map((r) => ({
        PerformedAt: fmtISO(r.performedAt),
        Machine: machineName(r, machineMap),
        Type: r.type || "",
        By:
          (r?.details?.initials || "").trim() ||
          displayUser(r.createdBy, userMap),
        VolumeUsedMl: r.volumeUsedMl ?? "",
        Notes: r.notes || "",
      }));
    }

    if (kind === "decon") {
      if (!DeconLog)
        return res.status(501).json({ error: "DeconLog model not available." });
      const q = { createdAt: { $gte: start, $lt: end } };
      if (req.query.clinic) q.clinic = String(req.query.clinic);
      const docs = await DeconLog.find(q).sort({ receivedAt: 1 }).lean();

      const flattenInOut = (obj, prefix) => {
        const o = {};
        const keys = Object.keys(obj || {});
        for (const k of keys) {
          const v = obj[k] || {};
          o[`${prefix}_${k}_in`] = v.in ?? 0;
          o[`${prefix}_${k}_out`] = v.out ?? 0;
        }
        return o;
      };

      rows = docs.map((d) => ({
        Clinic: d.clinic || "",
        ReceivedAt: fmtISO(d.receivedAt),
        SentAt: fmtISO(d.sentAt),
        VerifiedInBy: d.verifiedInBy || "",
        VerifiedOutBy: d.verifiedOutBy || "",
        ...flattenInOut(d.sets, "sets"),
        ...flattenInOut(d.womens, "womens"),
        Notes: d.notes || "",
      }));
    }

    if (kind === "transport") {
      if (!TransportTrip)
        return res
          .status(501)
          .json({ error: "TransportTrip model not available." });
      const q = { date: { $gte: start, $lt: end } };
      const docs = await TransportTrip.find(q).sort({ date: 1 }).lean();

      rows = docs.map((t) => ({
        Date: fmtISO(t.date),
        Driver: t.driver || "",
        Destination: t.destination || "",
        StartMileage: t.startMileage ?? "",
        ReturnMileage: t.returnMileage ?? "",
        DepartAt: fmtISO(t.departAt),
        ReturnAt: fmtISO(t.returnAt),
        WashOrGas: t.washOrGas ? "true" : "false",
        ReceiptFiled: t.receiptFiled ? "true" : "false",
        Notes: t.notes || "",
      }));
    }

    if (kind === "fuel") {
      if (!FuelPurchase)
        return res
          .status(501)
          .json({ error: "FuelPurchase model not available." });
      const q = { date: { $gte: start, $lt: end } };
      const docs = await FuelPurchase.find(q).sort({ date: 1 }).lean();
      const userMap = await buildUserMap({ fuels: docs });

      rows = docs.map((f) => ({
        Date: fmtISO(f.date),
        Mileage: f.mileage ?? "",
        PricePerGallon: f.pricePerGallon ?? "",
        Gallons: f.gallons ?? "",
        Amount: f.amount ?? "",
        Vendor: f.vendor || "",
        LoggedBy:
          (f.signature || "").trim() || displayUser(f.createdBy, userMap),
        Signature: f.signature || "",
        Notes: f.notes || "",
      }));
    }

    const csv = toCSV(rows);
    const filename = `${kind}-${y}-${String(m).padStart(2, "0")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (err) {
    console.error("CSV error:", err?.message, err?.stack);
    return res.status(500).json({ error: "Failed to generate CSV." });
  }
});

/* ========================================================================== */
/* =                                   PDF                                  = */
/* ========================================================================== */

router.get("/monthly", requireAuth, async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "Invalid year or month." });
    }

    const { start, end } = monthRangeUTC(y, m);

    const [
      cycles = [],
      controlBIs = [],
      maintenance = [],
      deconLogs = [],
      trips = [],
      fuels = [],
    ] = await Promise.all([
      Cycle
        ? Cycle.find({ startedAt: { $gte: start, $lt: end } })
            .sort({ startedAt: 1 })
            .populate("machineId", "name _id")
            .lean()
        : [],
      ControlBI
        ? ControlBI.find({ incubatedAt: { $gte: start, $lt: end } })
            .sort({ incubatedAt: 1 })
            .lean()
        : [],
      Maintenance
        ? Maintenance.find({ performedAt: { $gte: start, $lt: end } })
            .sort({ performedAt: 1 })
            .populate("machineId", "name _id")
            .lean()
        : [],
      DeconLog
        ? DeconLog.find({ createdAt: { $gte: start, $lt: end } })
            .sort({ receivedAt: 1 })
            .lean()
        : [],
      TransportTrip
        ? TransportTrip.find({ date: { $gte: start, $lt: end } })
            .sort({ date: 1 })
            .lean()
        : [],
      FuelPurchase
        ? FuelPurchase.find({ date: { $gte: start, $lt: end } })
            .sort({ date: 1 })
            .lean()
        : [],
    ]);

    const machineMap = await buildMachineMap();
    const userMap = await buildUserMap({
      cycles,
      controls: controlBIs,
      maintenance,
      deconLogs,
      trips,
      fuels,
    });

    const mm = String(m).padStart(2, "0");
    const filename = `spt-report-${y}-${mm}.pdf`;

    const fmt = fmtLocal12; // alias for brevity
    const getMachineName = (row) => machineName(row, machineMap);
    const u = (val) => displayUser(val, userMap);

    const countBy = (arr, fn) =>
      arr.reduce((acc, it) => {
        const k = fn(it) || "";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
    const cyclesTotal = cycles.length;
    const cyclesResultCounts = countBy(cycles, (c) =>
      (c.result || "").toLowerCase()
    );
    const cyclesPassed =
      (cyclesResultCounts.pass || 0) +
      (cyclesResultCounts.passed || 0) +
      (cyclesResultCounts.success || 0);
    const cyclesFailed =
      (cyclesResultCounts.fail || 0) +
      (cyclesResultCounts.failed || 0) +
      (cyclesResultCounts.aborted || 0);
    const spores = cycles.filter((c) => c?.spore?.ran);
    const sporesTotal = spores.length;
    const sporeNeg = spores.filter(
      (c) => (c.spore?.result || "").toLowerCase() === "negative"
    ).length;
    const sporePos = spores.filter(
      (c) => (c.spore?.result || "").toLowerCase() === "positive"
    ).length;
    const controlTotal = controlBIs.length;
    const controlPos = controlBIs.filter(
      (r) => (r.result || "").toLowerCase() === "positive"
    ).length;
    const controlNeg = controlBIs.filter(
      (r) => (r.result || "").toLowerCase() === "negative"
    ).length;
    const maintTotal = maintenance.length;
    const maintByType = countBy(maintenance, (r) => r.type || "unspecified");
    const deconTotal = deconLogs.length;
    const tripsTotal = trips.length;
    const fuelTotal = fuels.length;
    const fuelAmount = fuels.reduce(
      (sum, f) => sum + (Number(f.amount) || 0),
      0
    );
    const fuelGallons = fuels.reduce(
      (sum, f) => sum + (Number(f.gallons) || 0),
      0
    );

    // -------- PDF setup ----------
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      margin: 36,
    });

    const chunks = [];
    doc.on("data", (b) => chunks.push(b));
    doc.on("error", (e) => console.error("PDF error", e));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Length", String(buffer.length));
      res.status(200).end(buffer);
    });

    const margin = 36;
    const pageWidth = doc.page.width - margin * 2;
    const pageHeight = doc.page.height - margin * 2;
    let cursorY = margin;

    function drawHeader() {
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Sterile Processing — Monthly Report", margin, margin);
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Period: ${y}-${mm}`, margin, margin + 20);
      doc
        .moveTo(margin, margin + 34)
        .lineTo(margin + pageWidth, margin + 34)
        .strokeColor("#999")
        .lineWidth(0.5)
        .stroke();
      cursorY = margin + 44;
    }
    function drawFooter() {
      const text = `Page ${doc.page.number}`;
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(text, margin, doc.page.height - margin - 12, {
          width: pageWidth,
          align: "right",
        });
    }
    doc.on("pageAdded", () => {
      drawHeader();
      drawFooter();
    });
    drawHeader();
    drawFooter();

    const ensureSpace = (need) => {
      if (cursorY + need > margin + pageHeight) {
        doc.addPage();
      }
    };

    const sectionTitle = (txt) => {
      ensureSpace(28);
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(txt, margin, cursorY);
      cursorY = doc.y + 6;
    };

    const paragraph = (txt) => {
      ensureSpace(40);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#000")
        .text(txt, margin, cursorY, {
          width: pageWidth,
        });
      cursorY = doc.y + 6;
    };

    function drawTable(columns, rows, opts = {}) {
      const headerH = opts.headerH || 18;
      const rowGap = opts.rowGap || 4;
      const zebra = opts.zebra ?? true;

      const totalRatio = columns.reduce((sum, c) => sum + (c.ratio || 0), 0);
      const fixedTotal = columns.reduce((sum, c) => sum + (c.width || 0), 0);
      const flexWidth = pageWidth - fixedTotal;
      const widths = columns.map((c) =>
        c.width ? c.width : Math.max(40, (c.ratio / totalRatio) * flexWidth)
      );

      const xStarts = [];
      let x = margin;
      for (const w of widths) {
        xStarts.push(x);
        x += w;
      }

      ensureSpace(headerH + 6);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
      columns.forEach((c, i) => {
        doc.text(c.label, xStarts[i], cursorY, {
          width: widths[i],
          continued: false,
        });
      });
      cursorY += headerH;
      doc
        .moveTo(margin, cursorY)
        .lineTo(margin + pageWidth, cursorY)
        .strokeColor("#bbb")
        .lineWidth(0.5)
        .stroke();
      cursorY += 2;

      doc.font("Helvetica").fontSize(10);
      rows.forEach((row, rowIdx) => {
        const heights = columns.map((c, i) => {
          const txt = String(row[c.key] ?? "");
          const h = doc.heightOfString(txt, { width: widths[i] });
          return Math.max(14, h);
        });
        const rowH = Math.max(...heights) + rowGap;

        ensureSpace(rowH + 6);
        if (zebra && rowIdx % 2 === 0) {
          doc
            .save()
            .rect(margin, cursorY - 2, pageWidth, rowH)
            .fillOpacity(0.04)
            .fill("#000")
            .restore();
        }

        columns.forEach((c, i) => {
          const txt = String(row[c.key] ?? "");
          doc
            .fillColor("#000")
            .text(txt, xStarts[i], cursorY, { width: widths[i] });
        });
        cursorY += rowH;
      });

      cursorY += 4;
    }

    /* ---------------- CONTENT ---------------- */

    sectionTitle("Summary");
    paragraph(
      [
        `Cycles: ${cyclesTotal}  •  Passed: ${cyclesPassed}  •  Failed: ${cyclesFailed}`,
        `Spores: ${sporesTotal}  •  Negative: ${sporeNeg}  •  Positive: ${sporePos}`,
        `Controls: ${controlTotal}  •  Positive: ${controlPos}  •  Negative: ${controlNeg}`,
        `Maintenance: ${maintTotal}  •  Types: ${Object.entries(maintByType)
          .map(([k, v]) => `${k}(${v})`)
          .join(", ")}`,
        `Decontamination logs: ${deconTotal}`,
        `Transport trips: ${tripsTotal}`,
        `Fuel purchases: ${fuelTotal}  •  Gallons: ${fuelGallons.toFixed(
          2
        )}  •  Amount: $${fuelAmount.toFixed(2)}`,
      ].join("\n")
    );

    // Cycles
    if (cyclesTotal > 0) {
      sectionTitle("Cycles");
      const cols = [
        { key: "Date", label: "Date", ratio: 1.1 },
        { key: "Machine", label: "Machine", ratio: 1.3 },
        { key: "Load", label: "Load #", width: 70 },
        { key: "Result", label: "Result", width: 80 },
        { key: "LoadedBy", label: "Loaded By", width: 110 },
        { key: "UnloadedBy", label: "Unloaded By", width: 110 },
        { key: "Items", label: "Items", ratio: 2.1 },
      ];
      const rows = cycles.map((c) => ({
        Date: fmt(c.startedAt),
        Machine: getMachineName(c),
        Load: c.loadNumber || "",
        Result: c.result || "",
        LoadedBy: c.loadStaff || "",
        UnloadedBy: c.unloadStaff || "",
        Items: c.items || "",
      }));
      drawTable(cols, rows);
    }

    // Spores
    if (sporesTotal > 0) {
      sectionTitle("Spores (from Cycles)");
      const cols = [
        { key: "Date", label: "Cycle Date", ratio: 1.2 },
        { key: "Machine", label: "Machine", ratio: 1.3 },
        { key: "Incubator", label: "Incubator", width: 100 },
        { key: "Lot", label: "Lot", width: 90 },
        { key: "Well", label: "Well", width: 70 },
        { key: "Result", label: "Result", width: 80 },
        { key: "ReadAt", label: "Read At", ratio: 1.1 },
        { key: "VerifiedBy", label: "Verified By", width: 110 },
      ];
      const rows = spores.map((c) => ({
        Date: fmt(c.startedAt),
        Machine: getMachineName(c),
        Incubator: c.spore?.incubatorId || "",
        Lot: c.spore?.lot || "",
        Well: c.spore?.well || "",
        Result: c.spore?.result || "",
        ReadAt: fmt(c.spore?.readAt || c.spore?.verifiedAt || c.completedAt),
        VerifiedBy: c.spore?.verifiedBy || "",
      }));
      drawTable(cols, rows);
    }

    // Control BI
    if (controlTotal > 0) {
      sectionTitle("Control BI");
      const cols = [
        { key: "IncubatedAt", label: "Incubated At", ratio: 1.3 },
        { key: "VerifiedAt", label: "Verified At", ratio: 1.3 },
        { key: "Incubator", label: "Incubator", width: 100 },
        { key: "Lot", label: "Lot", width: 90 },
        { key: "Well", label: "Well", width: 70 },
        { key: "Result", label: "Result", width: 80 },
        { key: "VerifiedBy", label: "Verified By", width: 110 },
        { key: "Notes", label: "Notes", ratio: 1.8 },
      ];
      const rows = controlBIs.map((r) => ({
        IncubatedAt: fmt(r.incubatedAt),
        VerifiedAt: fmt(r.verifiedAt),
        Incubator: r.incubatorId || "",
        Lot: r.lot || "",
        Well: r.well || "",
        Result: r.result || "",
        VerifiedBy: r.verifiedBy || "",
        Notes: r.notes || "",
      }));
      drawTable(cols, rows);
    }

    // Maintenance
    if (maintTotal > 0) {
      sectionTitle("Maintenance");
      const cols = [
        { key: "PerformedAt", label: "Performed At", ratio: 1.3 },
        { key: "Machine", label: "Machine", ratio: 1.3 },
        { key: "Type", label: "Type", width: 150 },
        { key: "By", label: "By", width: 120 },
        { key: "Notes", label: "Notes", ratio: 2.2 },
      ];

      const rows = maintenance.map((r) => ({
        PerformedAt: fmt(r.performedAt),
        Machine: getMachineName(r),
        Type: r.type || "",
        By:
          (
            r?.details?.initials ||
            r?.details?.Initials ||
            r?.details?.performedBy ||
            r?.details?.by ||
            r?.details?.operator ||
            r?.details?.staff ||
            ""
          )
            .toString()
            .trim() ||
          // Derive initials from createdBy.name (same as your UI logic)
          (r.createdBy?.name
            ? r.createdBy.name
                .split(/\s+/)
                .map((s) => s[0])
                .join("")
                .toUpperCase()
            : u(r.createdBy)),
        Notes: r.notes || "",
      }));

      drawTable(cols, rows);
    }

    // Decontamination Logs
    if (deconLogs.length > 0) {
      sectionTitle("Decontamination Logs");
      const cols = [
        { key: "Clinic", label: "Clinic", width: 140 },
        { key: "ReceivedAt", label: "Received", ratio: 1.1 },
        { key: "SentAt", label: "Sent", ratio: 1.1 },
        { key: "VerifiedInBy", label: "In By", width: 110 },
        { key: "VerifiedOutBy", label: "Out By", width: 110 },
        { key: "Notes", label: "Notes", ratio: 2.6 },
      ];
      const rows = deconLogs.map((d) => ({
        Clinic: d.clinic || "",
        ReceivedAt: fmt(d.receivedAt),
        SentAt: fmt(d.sentAt),
        VerifiedInBy: d.verifiedInBy || "",
        VerifiedOutBy: d.verifiedOutBy || "",
        Notes: d.notes || "",
      }));
      drawTable(cols, rows);
    }

    // Transport Trips
    if (tripsTotal > 0) {
      sectionTitle("Transport Trips");
      const cols = [
        { key: "Date", label: "Date", ratio: 1.2 },
        { key: "Driver", label: "Driver", width: 120 },
        { key: "Destination", label: "Destination", ratio: 2.2 },
        { key: "Start", label: "Start Mi", width: 80 },
        { key: "Return", label: "Return Mi", width: 90 },
        { key: "Notes", label: "Notes", ratio: 2.0 },
      ];
      const rows = trips.map((t) => ({
        Date: fmt(t.date),
        Driver: t.driver || "",
        Destination: t.destination || "",
        Start: t.startMileage ?? "",
        Return: t.returnMileage ?? "",
        Notes: t.notes || "",
      }));
      drawTable(cols, rows);
    }

    // Fuel Purchases
    if (fuelTotal > 0) {
      sectionTitle("Fuel Purchases");
      const cols = [
        { key: "Date", label: "Date", ratio: 1.2 },
        { key: "Gallons", label: "Gallons", width: 80 },
        { key: "Price", label: "$/Gal", width: 70 },
        { key: "Amount", label: "Amount", width: 90 },
        { key: "Vendor", label: "Vendor", width: 160 },
        { key: "LoggedBy", label: "Logged By", width: 120 },
        { key: "Notes", label: "Notes", ratio: 2.0 },
      ];
      const rows = fuels.map((f) => ({
        Date: fmt(f.date),
        Gallons: f.gallons ?? "",
        Price: f.pricePerGallon ?? "",
        Amount: f.amount ?? "",
        Vendor: f.vendor || "",
        LoggedBy: (f.signature || "").trim() || u(f.createdBy),
        Notes: f.notes || "",
      }));
      drawTable(cols, rows);
    }

    doc.end();
  } catch (err) {
    console.error("Monthly report error:", err?.message, err?.stack);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

module.exports = router;
