const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── PATCH /api/cases/:id/label — Analyst marks true/false positive ──
router.patch(
  '/:id/label',
  requireAuth,
  requireRole('admin'),
  [
    body('label')
      .isIn(['true_positive', 'false_positive', 'unreviewed'])
      .withMessage('Label must be true_positive, false_positive, or unreviewed'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { label } = req.body;

      const txn = await Transaction.findByIdAndUpdate(
        id,
        { analystLabel: label },
        { new: true }
      );

      if (!txn) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({ transaction: txn });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/cases/pending — Get unreviewed flagged transactions ──
router.get('/pending', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      analystLabel: 'unreviewed'
    };

    const [cases, total] = await Promise.all([
      Transaction.find(filter).sort({ fraudScore: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      cases,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cases/stats — Case review statistics ──────────
router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [total, truePositives, falsePositives, unreviewed] = await Promise.all([
      Transaction.countDocuments({}),
      Transaction.countDocuments({ analystLabel: 'true_positive' }),
      Transaction.countDocuments({ analystLabel: 'false_positive' }),
      Transaction.countDocuments({ analystLabel: 'unreviewed' }),
    ]);

    res.json({
      totalCases: total,
      truePositives,
      falsePositives,
      unreviewed,
      precision: total > 0 ? (truePositives / (truePositives + falsePositives || 1)).toFixed(4) : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
