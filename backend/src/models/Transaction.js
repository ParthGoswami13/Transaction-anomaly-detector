const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    cardNum: { type: String, required: true, index: true },
    merchant: { type: String, required: true },
    category: { type: String, default: 'unknown' },
    amount: { type: Number, required: true },
    transDateTime: { type: Date, required: true },

    // Geolocation
    lat: { type: Number, default: 0 },
    long: { type: Number, default: 0 },
    merchLat: { type: Number, default: 0 },
    merchLong: { type: Number, default: 0 },

    // AI-service enrichment
    fraudScore: { type: Number, default: null },
    fraudFlags: { type: [String], default: [] },
    isSmurfing: { type: Boolean, default: false },
    smurfingPattern: { type: String, default: null },

    // Analyst feedback loop (drives retraining)
    analystLabel: {
      type: String,
      enum: ['unreviewed', 'true_positive', 'false_positive'],
      default: 'unreviewed',
    },

    // Extra fields carried from the original dataset
    gender: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: Number },
    cityPop: { type: Number },
    job: { type: String },
    dob: { type: String },
    unixTime: { type: Number },

    // Reference to the user who submitted the transaction
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Index for common queries
transactionSchema.index({ fraudScore: -1 });
transactionSchema.index({ analystLabel: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
