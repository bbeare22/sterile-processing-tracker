const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const Maintenance = require('../models/Maintenance');
const Machine = require('../models/Machine');
const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const logger = require('../utils/logger');

const router = express.Router();

const WASHER_TYPES = ['washer', 'ultrasonic'];
const STERILIZER_TYPES = ['sterilizer'];

// Full set of types the endpoint accepts (validation first)
const BaseBody = z.object({
  machineId: z.string().min(1),
  type: z.enum([
    'descale',
    'daily_inspection',
    'cleaning',
    'repair',
    'qa',
    'washer_daily_verify',
    'washer_weekly_tasks',
  ]),
  performedAt: z.string().datetime(),
  volumeUsedMl: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional(),
  // free-shape "details" with reasonable guards
  details: z.record(z.any()).optional(),
});

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const { machineId, limit = 20 } = req.query;
    const filter = {};
    if (machineId) filter.machineId = machineId;

    const rows = await Maintenance.find(filter)
      .sort({ performedAt: -1, createdAt: -1 })
      .limit(Number(limit))
      .populate('machineId', 'name _id type')
      .populate('createdBy', 'name email _id')
      .lean();

    res.json({
      maintenance: rows.map((r) => ({
        ...r,
        // convenience field for UI initials (use name initials if present)
        performedBy:
          (r.createdBy?.name || '')
            .split(/\s+/)
            .map((s) => s[0])
            .join('')
            .toUpperCase() || '',
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list maintenance' });
  }
});

// POST /api/maintenance (create) — protected
router.post('/', requireAuth, async (req, res) => {
  try {
    const parsed = BaseBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }
    const body = parsed.data;

    if (!mongoose.isValidObjectId(body.machineId)) {
      return res.status(400).json({ error: 'Invalid machineId' });
    }
    const machine = await Machine.findById(body.machineId).lean();
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const isWasher = ['washer', 'ultrasonic'].includes(machine.type);
    const isSterilizer = ['sterilizer'].includes(machine.type);

    if (isWasher) {
      if (!['descale', 'washer_daily_verify', 'washer_weekly_tasks'].includes(body.type)) {
        return res.status(400).json({ error: 'Invalid maintenance type for this washer' });
      }
    } else if (isSterilizer) {
      if (!['daily_inspection', 'cleaning', 'repair', 'qa'].includes(body.type)) {
        return res.status(400).json({ error: 'Invalid maintenance type for sterilizer' });
      }
    } else {
      if (!['repair', 'qa', 'cleaning'].includes(body.type)) {
        return res.status(400).json({ error: 'Invalid maintenance type' });
      }
    }

    let volumeUsedMl = null;
    if (body.type === 'descale' && isWasher) {
      if (body.volumeUsedMl == null) {
        return res.status(400).json({ error: 'volumeUsedMl is required for descale' });
      }
      volumeUsedMl = Number(body.volumeUsedMl || 0);
    }

    const authedUserId = req.user?._id || req.userId || req.user;
    if (!authedUserId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Maintenance.create({
      machineId: body.machineId,
      type: body.type,
      performedAt: new Date(body.performedAt),
      notes: body.notes || '',
      volumeUsedMl,
      details: body.details || {},
      createdBy: authedUserId,
    });

    // AUDIT
    await recordAudit(req, {
      action: 'maintenance.create',
      targetType: 'Maintenance',
      targetId: doc._id,
      meta: { machineId: doc.machineId, type: doc.type },
    });

    res.status(201).json({ maintenance: doc });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to create maintenance' });
  }
});

module.exports = router;
