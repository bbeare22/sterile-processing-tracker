require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const { connectDB } = require("./config/db");

// Route modules
const authRoutes = require("./routes/auth");
const machinesRoutes = require("./routes/machines");
const maintenanceRoutes = require("./routes/maintenance");
const cyclesRoutes = require("./routes/cycles");
const sporesRoutes = require("./routes/spores");
const pmRoutes = require("./routes/pm");
const reportsRoutes = require("./routes/reports");
const deconRoutes = require("./routes/decon");
const controlsRoutes = require("./routes/controls");
const transportsRoutes = require("./routes/transports");
const auditRoutes = require("./routes/audit");

const app = express();

/* ---------------- security & core middleware ---------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());
app.use(morgan("tiny"));

// CORS (dev + prod) — must allow credentials and mirror the Origin
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (curl/Postman) and your dev UI
      const allowList = new Set([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        process.env.CLIENT_URL || "", // e.g., https://weatherapp.jumpingcrab.com
      ]);

      if (!origin || allowList.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true, // << required for cookies/Auth headers with fetch(..., { credentials: 'include' })
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
    exposedHeaders: ["Content-Disposition"], // so filename works on downloads
    optionsSuccessStatus: 204,
  })
);

/* ---------------- auth rate limit ---------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

/* ---------------- health ---------------- */
app.get("/health", (req, res) => res.json({ ok: true }));

/* ---------------- recalls proxy (OpenFDA) with caching ---------------- */
/**
 * Dataset docs: https://api.fda.gov/device/enforcement.json
 * Client expects: { rows: [...] }
 */
const recallCache = new Map(); // key -> { at: <ts>, data: { rows } }
const RECALL_TTL_MS = 60_000; // 1 minute cache TTL (tune as needed)

app.get("/api/external/recalls", async (req, res) => {
  try {
    const brand = (req.query.brand || "STERIS").trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit || 25), 100));
    const key = `${brand}:${limit}`;

    // serve from cache if fresh
    const cached = recallCache.get(key);
    if (cached && Date.now() - cached.at < RECALL_TTL_MS) {
      return res.json(cached.data);
    }

    const url = "https://api.fda.gov/device/enforcement.json";
    const search = `product_description:${brand}`;

    const r = await axios.get(url, {
      params: { search, limit },
      timeout: 10_000,
    });

    const rows = (r.data?.results || []).map((it) => ({
      recallNumber: it.recall_number,
      product: it.product_description,
      reason: it.reason_for_recall,
      status: it.status,
      classification: it.classification,
      codeInfo: it.code_info || "",
      firm: it.recalling_firm,
      states: it.distribution_pattern || "",
      reportDate: it.report_date || "", // YYYYMMDD
      recallInitiationDate: it.recall_initiation_date || "", // YYYYMMDD
      centerClassificationDate: it.center_classification_date || "",
      productQuantity: it.product_quantity || "",
      kNumbers: it.k_numbers || [],
    }));

    const payload = { rows };
    recallCache.set(key, { at: Date.now(), data: payload });
    return res.json(payload);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 429) {
      // FDA rate limit
      return res
        .status(502)
        .json({ error: "FDA rate limit hit — please try again in a minute." });
    }
    return res.status(502).json({ error: "Upstream recall service failed" });
  }
});

/* ---------------- application routes ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/machines", machinesRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/cycles", cyclesRoutes);
app.use("/api/spores", sporesRoutes);
app.use("/api/pm", pmRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/decon", deconRoutes);
app.use("/api/controls", controlsRoutes);
app.use("/api/transports", transportsRoutes);
app.use("/api/audit", auditRoutes);

/* ---------------- 404 for API ---------------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(404).send("Not found");
});

/* ---------------- global error handler ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

/* ---------------- boot ---------------- */
const PORT = process.env.PORT || 3001;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`SPT server listening on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("DB connection failed, exiting:", err.message);
    process.exit(1);
  });

// start daily reminder scheduler (no-op if module doesn't export start)
require("./jobs/reminder").start?.();
