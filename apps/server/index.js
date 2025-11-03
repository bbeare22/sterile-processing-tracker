require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const logger = require('./utils/logger');

const { connectDB } = require('./config/db');

// Route modules
const authRoutes = require('./routes/auth');
const machinesRoutes = require('./routes/machines');
const maintenanceRoutes = require('./routes/maintenance');
const cyclesRoutes = require('./routes/cycles');
const sporesRoutes = require('./routes/spores');
const pmRoutes = require('./routes/pm');
const reportsRoutes = require('./routes/reports');
const deconRoutes = require('./routes/decon');
const controlsRoutes = require('./routes/controls');
const transportsRoutes = require('./routes/transports');
const auditRoutes = require('./routes/audit');

const app = express();

/* ---------------- security & core middleware ---------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use(morgan('tiny'));

/* ---------------- CORS (Render-friendly) ---------------- */
const defaultAllowed = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
]);

function buildAllowList() {
  const list = new Set(defaultAllowed);
  const one = (process.env.CLIENT_URL || '').trim();
  if (one) list.add(one);
  const many = (process.env.CLIENT_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  many.forEach((o) => list.add(o));
  return list;
}

const allowList = buildAllowList();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server / health checks with no Origin
      if (!origin) return cb(null, true);
      if (allowList.has(origin)) return cb(null, true);

      // Log for visibility; return false to block
      logger.warn(`CORS blocked origin: ${origin}`);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
  })
);

/* ---------------- auth rate limit ---------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

/* ---------------- health ---------------- */
app.get('/health', (req, res) => res.json({ ok: true }));

/* ---------------- recalls proxy (OpenFDA) with caching ---------------- */
const recallCache = new Map();
const RECALL_TTL_MS = 60_000;

app.get('/api/external/recalls', async (req, res) => {
  try {
    const brand = (req.query.brand || 'STERIS').trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit || 25), 100));
    const key = `${brand}:${limit}`;

    const cached = recallCache.get(key);
    if (cached && Date.now() - cached.at < RECALL_TTL_MS) {
      return res.json(cached.data);
    }

    const url = 'https://api.fda.gov/device/enforcement.json';
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
      codeInfo: it.code_info || '',
      firm: it.recalling_firm,
      states: it.distribution_pattern || '',
      reportDate: it.report_date || '',
      recallInitiationDate: it.recall_initiation_date || '',
      centerClassificationDate: it.center_classification_date || '',
      productQuantity: it.product_quantity || '',
      kNumbers: it.k_numbers || [],
    }));

    const payload = { rows };
    recallCache.set(key, { at: Date.now(), data: payload });
    return res.json(payload);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 429) {
      return res.status(502).json({ error: 'FDA rate limit hit — please try again in a minute.' });
    }
    return res.status(502).json({ error: 'Upstream recall service failed' });
  }
});

/* ---------------- application routes ---------------- */
app.use('/api/auth', authRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/cycles', cyclesRoutes);
app.use('/api/spores', sporesRoutes);
app.use('/api/pm', pmRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/decon', deconRoutes);
app.use('/api/controls', controlsRoutes);
app.use('/api/transports', transportsRoutes);
app.use('/api/audit', auditRoutes);

/* ---------------- 404 for API ---------------- */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).send('Not found');
});

/* ---------------- global error handler ---------------- */
app.use((err, req, res, next) => {
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

/* ---------------- boot ---------------- */
const PORT = process.env.PORT || 3001;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => logger.info(`SPT server listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    logger.error('DB connection failed, exiting:', err.message);
    process.exit(1);
  });

require('./jobs/reminder').start?.();
