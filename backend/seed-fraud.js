require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finguard';

async function seedFraud() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create a fraud ring: 4 different cards transacting with the same shady merchant at weird hours
    const fakeData = [
      {
        cardNum: '1111222233334444',
        merchant: 'Shady Crypto Exchange',
        category: 'crypto',
        amount: 5400.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
        fraudScore: 0.88,
        fraudFlags: ['geolocation mismatch', 'high amount'],
        isSmurfing: true
      },
      {
        cardNum: '5555666677778888',
        merchant: 'Shady Crypto Exchange',
        category: 'crypto',
        amount: 4900.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 3),
        fraudScore: 0.91,
        fraudFlags: ['odd hour', 'high velocity'],
        isSmurfing: true
      },
      {
        cardNum: '9999000011112222',
        merchant: 'Shady Crypto Exchange',
        category: 'crypto',
        amount: 9800.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 5),
        fraudScore: 0.95,
        fraudFlags: ['known fraud merchant', 'high amount'],
        isSmurfing: true
      },
      {
        cardNum: '4321432143214321',
        merchant: 'Shady Crypto Exchange',
        category: 'crypto',
        amount: 12000.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 6),
        fraudScore: 0.99,
        fraudFlags: ['known fraud merchant', 'velocity spike'],
        isSmurfing: true
      },
      // Another small cluster
      {
        cardNum: '1234123412341234',
        merchant: 'Fake Electronics Store',
        category: 'shopping',
        amount: 1200.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 10),
        fraudScore: 0.76,
        fraudFlags: ['velocity spike'],
        isSmurfing: false
      },
      {
        cardNum: '1234123412341234',
        merchant: 'Luxury Watches Online',
        category: 'shopping',
        amount: 2500.00,
        transDateTime: new Date(Date.now() - 1000 * 60 * 60 * 11),
        fraudScore: 0.81,
        fraudFlags: ['velocity spike', 'unusual category'],
        isSmurfing: false
      },
      // A safe transaction
      {
        cardNum: '4444555566667777',
        merchant: 'Local Supermarket',
        category: 'grocery',
        amount: 150.00,
        transDateTime: new Date(),
        fraudScore: 0.05,
        fraudFlags: [],
        isSmurfing: false
      }
    ];

    await Transaction.insertMany(fakeData);
    console.log('Successfully inserted seed data. Added a major fraud ring around "Shady Crypto Exchange".');

    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedFraud();
