import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'QuickCart User',
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide your phone number'],
      unique: true,
      trim: true,
      match: [/^\+[1-9]\d{9,14}$/, 'Please provide a valid E.164 phone number'],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true, // Allows multiple null values
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;

