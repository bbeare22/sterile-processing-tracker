require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const axios = require("axios");

const { connectDB } = require("./config/db");
const machinesRoutes = require("./routes/machines");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("tiny"));

/** DEBUG: confirm env loaded */
console.log("MONGO_URI present?", Boolean(process.env.MONGO_URI));

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

/** API routes  */
app.use("/api/machines", machinesRoutes);

const PORT = process.env.PORT || 3001;

/** connect DB */
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
