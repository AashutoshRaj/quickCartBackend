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
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
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

