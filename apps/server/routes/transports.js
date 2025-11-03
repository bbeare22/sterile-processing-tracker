const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const TransportTrip = require('../models/TransportTrip');
const FuelPurchase = require('../models/FuelPurchase');
const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const logger = require('../utils/logger');

const router = express.Router();

/* ---------------- helpers ---------------- */
function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/* ---------------- validation ---------------- */
const TripBody = z.object({
  date: z.string().datetime(),
  driver: z.string().min(1),
  destination: z.string().min(1),
  startMileage: z.number().int().nonnegative(),
  departAt: z.string().datetime(),
  returnAt: z.string().datetime(),
  returnMileage: z.number().int().nonnegative(),
  washOrGas: z.boolean().optional(),
  receiptFiled: z.boolean().optional(),
  reviewedSchedule: z.boolean().optional(),
  countTransportsMorning: z.boolean().optional(),
  countTransportsReturn: z.boolean().optional(),
  countTransportsEndOfDay: z.boolean().optional(),
  copySheetsNeeded: z.enum(['yes', 'no', '']).optional(),
  gasReceiptSubmitted: z.enum(['yes', 'na', '']).optional(),
  techSignature: z.string().optional(),
  supervisorSignature: z.string().optional(),
  notes: z.string().optional(),
});

const FuelBody = z.object({
  date: z.string().datetime(),
  mileage: z.number().int().nonnegative(),
  pricePerGallon: z.number().nonnegative(),
  gallons: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
  vendor: z.string().optional(),
  signature: z.string().optional(),
  notes: z.string().optional(),
});

const ListQuery = z.object({
  kind: z.enum(['trip', 'fuel']).optional(), // filter subtype
  limit: z.coerce.number().int().min(1).max(500).optional(),
  dateFrom: z.string().datetime().optional(),
});

/* ---------------- trips ------------------- */
router.get('/', requireAuth, async (req, res) => {
  try {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query' });
    }
    const { kind, limit = 100, dateFrom } = parsed.data;

    const tripFilter = {};
    const fuelFilter = {};
    if (dateFrom) {
      const s = startOfDay(new Date(dateFrom));
      tripFilter.date = { $gte: s };
      fuelFilter.date = { $gte: s };
    }

    if (!kind || kind === 'trip') {
      const trips = await TransportTrip.find(tripFilter)
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name _id email')
        .lean();
      if (kind === 'trip') return res.json({ trips });
      // if no kind, include both
      const fuels = await FuelPurchase.find(fuelFilter)
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name _id email')
        .lean();
      return res.json({ trips, fuels });
    } else {
      const fuels = await FuelPurchase.find(fuelFilter)
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name _id email')
        .lean();
      return res.json({ fuels });
    }
  } catch {
    res.status(500).json({ error: 'Failed to list transports' });
  }
});

router.post('/trip', requireAuth, async (req, res) => {
  try {
    const parsed = TripBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }
    const b = parsed.data;
    const doc = await TransportTrip.create({
      ...b,
      date: new Date(b.date),
      departAt: new Date(b.departAt),
      returnAt: new Date(b.returnAt),
      createdBy: req.user?._id || req.userId || req.user,
    });

    // AUDIT
    await recordAudit(req, {
      action: 'transport.trip.create',
      targetType: 'TransportTrip',
      targetId: doc._id,
      meta: { driver: doc.driver, destination: doc.destination },
    });

    res.status(201).json({ trip: doc });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

router.post('/fuel', requireAuth, async (req, res) => {
  try {
    const parsed = FuelBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }
    const b = parsed.data;
    const doc = await FuelPurchase.create({
      ...b,
      date: new Date(b.date),
      createdBy: req.user?._id || req.userId || req.user,
    });

    // AUDIT
    await recordAudit(req, {
      action: 'transport.fuel.create',
      targetType: 'FuelPurchase',
      targetId: doc._id,
      meta: {
        amount: doc.amount,
        pricePerGallon: doc.pricePerGallon,
        vendor: doc.vendor,
      },
    });

    res.status(201).json({ fuel: doc });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to create fuel record' });
  }
});

module.exports = router;
