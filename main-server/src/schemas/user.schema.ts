import { Schema, Document } from 'mongoose';

export interface User extends Document {
  name: string;
  email: string;
  address: string;
  macAddresses: string[];
  otp: string;
  verifiedOtp: boolean;
  otpExpiresAt: number;
  mobileNumber: string;
  password: string;
  balance: number;
  isLoggedIn: boolean;
  isKYCVerified: boolean;
  accessToken?: string;
  fraudCount: number;
  accountNumber: number;
  gender: string;
}

export const UserSchema = new Schema<User>({
  email: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  macAddresses: { type: [String], required: true },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Number, required: false },
  verifiedOtp: { type: Boolean, default: false },
  mobileNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 2000 },
  isLoggedIn: { type: Boolean, default: false },
  isKYCVerified: { type: Boolean, default: false },
  accessToken: { type: String },
  fraudCount: {type: Number, default: 0},
  accountNumber: {type: Number, default: 0},
  gender: { type: String, required: true}
});
