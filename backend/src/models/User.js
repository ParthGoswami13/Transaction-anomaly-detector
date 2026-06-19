const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    address: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    gender: { type: String, enum: ['M', 'F', 'Other'], default: 'Other' },
    balance: { type: Number, default: 2000 },
    accountNumber: { type: Number, unique: true, sparse: true },
    isKYCVerified: { type: Boolean, default: false },
    fraudCount: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ['user', 'analyst', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate unique account number before save
userSchema.pre('save', async function (next) {
  if (this.accountNumber) return next();
  // Generate a random 10-digit account number
  this.accountNumber = Math.floor(1000000000 + Math.random() * 9000000000);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
