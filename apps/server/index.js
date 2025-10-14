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

/* ---------------- middleware ---------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());
app.use(morgan("tiny"));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

/* ---------------- auth rate limit ---------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // tune per needs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

/* ---------------- health + external proxy ---------------- */
app.get("/health", (req, res) => res.json({ ok: true }));

// External proxy: OpenFDA Device Enforcement (recalls)
app.get("/api/external/recalls", async (req, res) => {
  try {
    const brand = (req.query.brand || "STERIS").trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit || 25), 100));

    // Docs: https://api.fda.gov/device/enforcement.json
    const search = `product_description:${brand}`;
    const url = "https://api.fda.gov/device/enforcement.json";

    const r = await axios.get(url, {
      params: { search, limit },
      timeout: 10000,
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
      // enforcement dataset uses YYYYMMDD strings:
      reportDate: it.report_date || "",
      recallInitiationDate: it.recall_initiation_date || "",
      // helpful extras
      centerClassificationDate: it.center_classification_date || "",
      productQuantity: it.product_quantity || "",
      kNumbers: it.k_numbers || [],
    }));

    return res.json({ rows });
  } catch (e) {
    // don’t leak upstream details
    return res.status(502).json({ error: "Upstream recall service failed" });
  }
});

/* ---------------- routes ---------------- */
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

// start daily reminder scheduler (no-op if not configured)
require("./jobs/reminder").start?.();
