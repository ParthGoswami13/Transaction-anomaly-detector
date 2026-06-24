/**
 * Seed script — creates a default admin account.
 * Safe to run multiple times (idempotent).
 *
 * Usage:  node src/seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_EMAIL = 'admin@finguard.ai';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'FinGuard Admin';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`ℹ️  Admin account already exists: ${ADMIN_EMAIL}`);
      } else {
        existing.role = 'admin';
        await existing.save();
        console.log(`⬆️  Promoted existing user ${ADMIN_EMAIL} to admin`);
      }
    } else {
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        gender: 'Other',
        mobileNumber: '0000000000',
      });
      console.log(`🎉 Created admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }

    await mongoose.disconnect();
    console.log('✅ Done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
