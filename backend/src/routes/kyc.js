const express = require('express');
const multer = require('multer');
const { extractIdDetails } = require('../services/kyc/ocrProxy');
const KycRecord = require('../models/KycRecord');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── POST /api/kyc/extract — Upload ID + OCR ────────────────
router.post('/extract', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const extracted = await extractIdDetails(req.file.buffer);

    const record = await KycRecord.create({
      userId: req.user.id,
      extractedData: extracted,
      verificationStatus: 'pending',
    });

    res.json({ kycRecord: record });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kyc/manual — Manual KYC Submission ───────────
router.post('/manual', requireAuth, async (req, res, next) => {
  try {
    const { name, dob, idNumber } = req.body;
    
    if (!name || !idNumber) {
      return res.status(400).json({ error: 'Name and ID Number are required' });
    }

    const record = await KycRecord.create({
      userId: req.user.id,
      extractedData: { name, dob, idNumber },
      verificationStatus: 'pending',
    });

    res.json({ kycRecord: record });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/kyc/status — Get KYC status for current user ──
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const record = await KycRecord.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });

    const user = await User.findById(req.user.id).select('isKYCVerified');

    res.json({
      isVerified: user?.isKYCVerified ?? false,
      latestRecord: record,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/kyc/:id/verify — Admin approves/rejects KYC ─
router.patch('/:id/verify', requireAuth, async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified or rejected' });
    }

    const record = await KycRecord.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    // Update user's KYC status if verified
    if (status === 'verified') {
      await User.findByIdAndUpdate(record.userId, { isKYCVerified: true });
    }

    res.json({ kycRecord: record });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
