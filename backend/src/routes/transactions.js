const express = require('express');
const axios = require('axios');
const { body, query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── POST /api/transactions — Create + Score ────────────────
router.post(
  '/',
  requireAuth,
  [
    body('cardNum').notEmpty().withMessage('Card number is required'),
    body('merchant').notEmpty().withMessage('Merchant is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('transDateTime').notEmpty().withMessage('Transaction date/time is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const txnData = req.body;

      // Call AI service for fraud scoring + smurfing detection
      let aiResult = null;
      try {
        const payload = {
          cardNum: txnData.cardNum,
          merchant: txnData.merchant,
          amt: parseFloat(txnData.amount),
          trans_date_trans_time: txnData.transDateTime,
          lat: parseFloat(txnData.lat) || 0,
          long: parseFloat(txnData.long) || 0,
          merch_lat: parseFloat(txnData.merchLat) || 0,
          merch_long: parseFloat(txnData.merchLong) || 0,
          category: txnData.category || 'unknown',
          gender: txnData.gender || 'M',
          city_pop: parseInt(txnData.cityPop) || 1,
          cc_num: txnData.cardNum,
          zip: parseInt(txnData.zip) || 0,
          unix_time: txnData.unixTime || Math.floor(new Date(txnData.transDateTime).getTime() / 1000),
        };

        const { data } = await axios.post(
          `${AI_SERVICE_URL}/analyze_transaction`,
          payload,
          { timeout: 10000 }
        );
        aiResult = data;
      } catch (aiErr) {
        console.warn('⚠️ AI service unavailable, saving without score:', aiErr.message);
      }

      // Save transaction with AI-enriched data
      const saved = await Transaction.create({
        cardNum: txnData.cardNum,
        merchant: txnData.merchant,
        category: txnData.category || 'unknown',
        amount: parseFloat(txnData.amount),
        transDateTime: new Date(txnData.transDateTime),
        lat: parseFloat(txnData.lat) || 0,
        long: parseFloat(txnData.long) || 0,
        merchLat: parseFloat(txnData.merchLat) || 0,
        merchLong: parseFloat(txnData.merchLong) || 0,
        gender: txnData.gender,
        city: txnData.city,
        state: txnData.state,
        zip: txnData.zip,
        cityPop: txnData.cityPop,
        job: txnData.job,
        dob: txnData.dob,
        unixTime: txnData.unixTime,
        userId: req.user.id,
        // AI enrichment
        fraudScore: aiResult?.fraud_detection?.confidence ?? null,
        fraudFlags: aiResult?.fraud_detection?.flags ?? [],
        isSmurfing: aiResult?.smurfing_detection?.is_smurfing ?? false,
        smurfingPattern: aiResult?.smurfing_detection?.pattern ?? null,
      });

      res.status(201).json({
        transaction: saved,
        aiAnalysis: aiResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/transactions — List with pagination ───────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter — users only see their own transactions
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }
    if (req.query.cardNum) filter.cardNum = req.query.cardNum;
    if (req.query.merchant) filter.merchant = { $regex: req.query.merchant, $options: 'i' };
    if (req.query.minAmount) filter.amount = { ...filter.amount, $gte: parseFloat(req.query.minAmount) };
    if (req.query.maxAmount) filter.amount = { ...filter.amount, $lte: parseFloat(req.query.maxAmount) };
    if (req.query.label) filter.analystLabel = req.query.label;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/flagged — High-risk transactions ─
router.get('/flagged', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.5;
    const transactions = await Transaction.find({
      fraudScore: { $gte: threshold },
    })
      .sort({ fraudScore: -1 })
      .limit(100);

    res.json({ transactions, threshold });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/stats — Dashboard statistics ─────
router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [
      totalCount,
      fraudCount,
      smurfingCount,
      unreviewedCount,
      recentTransactions,
    ] = await Promise.all([
      Transaction.countDocuments(),
      Transaction.countDocuments({ fraudScore: { $gte: 0.5 } }),
      Transaction.countDocuments({ isSmurfing: true }),
      Transaction.countDocuments({ analystLabel: 'unreviewed', fraudScore: { $gte: 0.5 } }),
      Transaction.find().sort({ createdAt: -1 }).limit(5).select('cardNum merchant amount fraudScore createdAt fraudFlags isSmurfing smurfingPattern analystLabel'),
    ]);

    // Risk distribution
    const riskDistribution = await Transaction.aggregate([
      {
        $bucket: {
          groupBy: '$fraudScore',
          boundaries: [0, 0.3, 0.5, 0.7, 1.01],
          default: 'unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    // Daily transaction volume (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyVolume = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgFraudScore: { $avg: '$fraudScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalTransactions: totalCount,
      flaggedFraud: fraudCount,
      smurfingDetected: smurfingCount,
      pendingReview: unreviewedCount,
      recentTransactions,
      riskDistribution,
      dailyVolume,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/:id ──────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ transaction: txn });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
