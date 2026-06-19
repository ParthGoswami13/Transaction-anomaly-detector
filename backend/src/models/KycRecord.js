const mongoose = require('mongoose');

const kycRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentUrl: { type: String, default: null },
    extractedData: {
      type: Object,
      default: null, // { name, dob, idNumber } from OCR
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KycRecord', kycRecordSchema);
