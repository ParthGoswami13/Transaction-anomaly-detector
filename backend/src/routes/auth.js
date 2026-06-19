const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('gender').optional().isIn(['M', 'F', 'Other']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, address, mobileNumber, gender } = req.body;

      // Check if user already exists
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const user = await User.create({
        name,
        email,
        password,
        address: address || '',
        mobileNumber: mobileNumber || '',
        gender: gender || 'Other',
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: user.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ───────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user with password field included
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: user.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/auth/me ───────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/users ────────────────────────────────────
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      'name email accountNumber balance fraudCount isKYCVerified'
    );
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
