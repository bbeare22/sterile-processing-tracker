require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const axios = require("axios");

const { connectDB } = require("./config/db");

const machinesRoutes = require("./routes/machines");
const maintenanceRoutes = require("./routes/maintenance");
const authRoutes = require("./routes/auth");
const cyclesRoutes = require("./routes/cycles");
const sporesRoutes = require("./routes/spores");
const pmRoutes = require("./routes/pm");
const reportsRoutes = require("./routes/reports");
const deconRoutes = require("./routes/decon");
const controlsRoutes = require("./routes/controls");
const transportsRoutes = require("./routes/transports");

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan("tiny"));

// ONE cors() with Authorization allowed
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/** External proxy: OpenFDA Recalls */
app.get("/api/external/recalls", async (req, res) => {
  try {
    const brand = (req.query.brand || "STERIS").trim();
    const limit = Number(req.query.limit || 25);
    const search = `product_description:${brand}`;
    const url = `https://api.fda.gov/device/enforcement.json?search=${encodeURIComponent(
      search
    )}&limit=${limit}`;
    const { data } = await axios.get(url);
    const rows = (data.results || []).map((r) => ({
      recallNumber: r.recall_number,
      product: r.product_description,
      reason: r.reason_for_recall,
      status: r.status,
      classification: r.classification,
      recallingFirm: r.recalling_firm,
      reportDate: r.report_date,
      codeInfo: r.code_info,
      state: r.state,
      country: r.country,
    }));
    res.json({ rows });
  } catch (e) {
    res.status(502).json({
      error: "Third-party API error",
      details: e?.response?.data || e.message,
    });
  }
});

/** Routes */
app.get("/health", (req, res) => res.json({ ok: true }));
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
