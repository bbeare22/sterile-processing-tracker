const cron = require("node-cron");
const mongoose = require("mongoose");
const PMTask = require("../models/PMTask");
const Machine = require("../models/Machine");
const Maintenance = require("../models/Maintenance");
const ControlBI = require("../models/ControlBI");
const { sendMail } = require("../utils/mailer");
const logger = require("../utils/logger");

/* ---------------- time helpers (TZ-aware “today” bounds) ---------------- */
function tzDayBounds(timeZone, when = new Date()) {
  // Compute the start/end of “today” in a specific IANA TZ, returned as UTC Dates.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(when).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const yyyy = parts.year;
  const mm = parts.month;
  const dd = parts.day;

  // “Local midnight” in that TZ as an ISO string with offset via fake date string:
  // We create a string "YYYY-MM-DDT00:00:00" in that TZ by using the same TZ formatter
  // Then parse as Date to get a UTC timestamp for the boundary.
  const startLocal = new Date(
    new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`))
    )
  );
  const endLocal = new Date(
    new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(`${yyyy}-${mm}-${dd}T23:59:59Z`))
    )
  );

  // Normalize to exact day bounds (inclusive start, exclusive end)
  const start = new Date(startLocal);
  start.setUTCHours(0, 0, 0, 0); // keep consistency
  const end = new Date(endLocal.getTime() + 1000); // move just past 23:59:59
  return { start, end, label: `${yyyy}-${mm}-${dd}` };
}

function fmtLocal(d, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(d));
  } catch {
    return new Date(d).toLocaleString("en-US", { hour12: true });
  }
}

/* ---------------- existing PM overdue digest ---------------- */
async function buildOverduePMDigest(tz) {
  const now = new Date();
  const tasks = await PMTask.find({
    status: "pending",
    dueAt: { $lt: now },
  })
    .sort({ dueAt: 1 })
    .populate("machineId", "name location type")
    .lean();

  if (!tasks.length) return null;

  const lines = [];
  lines.push(`Overdue Preventive Maintenance — ${fmtLocal(now, tz)}`);
  lines.push("");
  for (const t of tasks) {
    const m = t.machineId || {};
    lines.push(
      `• ${t.name} — ${m.name || "Unknown"} (${m.type || "?"}${
        m.location ? " @ " + m.location : ""
      }) — due ${fmtLocal(t.dueAt, tz)}`
    );
  }
  return lines.join("\n");
}

/* ---------------- NEW: Compliance checks ---------------- */
/**
 * Daily:
 *  - per washer: "washer_daily_verify" today
 *  - per sterilizer: "daily_inspection" today
 *  - controls: at least one Control BI incubated today and VERIFIED POSITIVE today
 *
 * Weekly:
 *  - per washer: last "descale" within 7 days
 *
 * Quarterly:
 *  - per sterilizer: last "cleaning" within 90 days
 */
async function buildComplianceAlerts(tz) {
  const { start, end, label } = tzDayBounds(tz);
  const now = new Date();

  const washers = await Machine.find({
    type: { $in: ["washer", "ultrasonic"] },
  })
    .select("_id name location type")
    .lean();
  const sterilizers = await Machine.find({ type: "sterilizer" })
    .select("_id name location type")
    .lean();

  const lines = [];

  // ---- Daily: washer verify (rack test + debris screen)
  if (washers.length) {
    const dailyWasherCounts = await Maintenance.aggregate([
      {
        $match: {
          type: "washer_daily_verify",
          performedAt: { $gte: start, $lt: end },
          machineId: { $in: washers.map((w) => w._id) },
        },
      },
      { $group: { _id: "$machineId", count: { $sum: 1 } } },
    ]);
    const haveMap = new Map(
      dailyWasherCounts.map((r) => [String(r._id), r.count])
    );
    for (const m of washers) {
      if (!haveMap.get(String(m._id))) {
        lines.push(
          `DAILY • Washer verify missing for ${m.name}${
            m.location ? " @ " + m.location : ""
          } (date ${label})`
        );
      }
    }
  }

  // ---- Daily: sterilizer inspection
  if (sterilizers.length) {
    const dailySterCounts = await Maintenance.aggregate([
      {
        $match: {
          type: "daily_inspection",
          performedAt: { $gte: start, $lt: end },
          machineId: { $in: sterilizers.map((s) => s._id) },
        },
      },
      { $group: { _id: "$machineId", count: { $sum: 1 } } },
    ]);
    const haveMap = new Map(
      dailySterCounts.map((r) => [String(r._id), r.count])
    );
    for (const m of sterilizers) {
      if (!haveMap.get(String(m._id))) {
        lines.push(
          `DAILY • Sterilizer inspection missing for ${m.name}${
            m.location ? " @ " + m.location : ""
          } (date ${label})`
        );
      }
    }
  }

  // ---- Daily: Control BI (must be verified POSITIVE today)
  // “at least logged today” instead, change the filter below.
  const controlsToday = await ControlBI.countDocuments({
    incubatedAt: { $gte: start, $lt: end },
    result: "positive",
    verifiedAt: { $gte: start, $lt: end },
  });
  if (controlsToday === 0) {
    lines.push(`DAILY • Control BI not verified POSITIVE for ${label}`);
  }

  // ---- Weekly: Washer descale within last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (washers.length) {
    const latestDescales = await Maintenance.aggregate([
      {
        $match: {
          type: "descale",
          machineId: { $in: washers.map((w) => w._id) },
        },
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: "$machineId",
          lastAt: { $first: "$performedAt" },
        },
      },
    ]);
    const lastMap = new Map(
      latestDescales.map((r) => [String(r._id), r.lastAt])
    );
    for (const m of washers) {
      const last = lastMap.get(String(m._id));
      if (!last || new Date(last) < sevenDaysAgo) {
        lines.push(
          `WEEKLY • Descale overdue for ${m.name}${
            m.location ? " @ " + m.location : ""
          } (last: ${last ? fmtLocal(last, tz) : "never"})`
        );
      }
    }
  }

  // ---- Quarterly: Sterilizer cleaning within last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (sterilizers.length) {
    const latestCleanings = await Maintenance.aggregate([
      {
        $match: {
          type: "cleaning",
          machineId: { $in: sterilizers.map((s) => s._id) },
        },
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: "$machineId",
          lastAt: { $first: "$performedAt" },
        },
      },
    ]);
    const lastMap = new Map(
      latestCleanings.map((r) => [String(r._id), r.lastAt])
    );
    for (const m of sterilizers) {
      const last = lastMap.get(String(m._id));
      if (!last || new Date(last) < ninetyDaysAgo) {
        lines.push(
          `QUARTERLY • Sterilizer cleaning overdue for ${m.name}${
            m.location ? " @ " + m.location : ""
          } (last: ${last ? fmtLocal(last, tz) : "never"})`
        );
      }
    }
  }

  if (!lines.length) return null;

  const header = `Compliance Alerts — ${fmtLocal(now, tz)}\n`;
  return header + "\n" + lines.join("\n");
}

/* ---------------- scheduler ---------------- */
function start() {
  const tz = process.env.CRON_TZ || "UTC";
  const hr = String(process.env.CRON_HOUR || "8");
  const min = String(process.env.CRON_MINUTE || "0");
  const expr = `${min} ${hr} * * *`; // every day at HR:MIN

  cron.schedule(
    expr,
    async () => {
      try {
        const sections = [];

        const pm = await buildOverduePMDigest(tz);
        if (pm) sections.push(pm);

        const compliance = await buildComplianceAlerts(tz);
        if (compliance) sections.push(compliance);

        if (!sections.length) {
          logger.info("[reminders] Nothing to notify today.");
          return;
        }

        const body = sections.join("\n\n" + "-".repeat(48) + "\n\n");

        await sendMail({
          subject: "SPD Tracker — Daily Alerts",
          text: body,
        });
        logger.info("[reminders] Sent daily alerts.");
      } catch (e) {
        logger.error("[reminders] Failed:", e);
      }
    },
    { timezone: tz }
  );

  logger.info(
    `[reminders] Scheduled daily digest at ${hr.padStart(
      2,
      "0"
    )}:${min.padStart(2, "0")} (${tz})`
  );
}

module.exports = { start };
