/**
 * User Model
 * Represents user data including profile, loyalty, and payment information
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IUser } from '../types/index';

/**
 * User schema definition
 * Handles user account information, preferences, and payment methods
 */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      default: 'QuickCart User',
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 6,
    },
    storeName: {
      type: String,
      sparse: true,
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
    loyaltyBalance: {
      points: {
        type: Number,
        default: 0,
      },
      validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    },
    savedPaymentMethods: [
      {
        _id: {
          type: Schema.Types.ObjectId,
          auto: true,
        },
        cardNumber: {
          type: String,
          required: true,
        },
        cardLast4: {
          type: String,
          required: true,
        },
        expiryDate: {
          type: String,
          required: true,
        },
        cardholderName: {
          type: String,
          required: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    profileImage: {
      url: {
        type: String,
        default: null,
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
    },
    preferences: {
      language: {
        type: String,
        default: 'English (US)',
        enum: ['English (US)', 'Hindi', 'Spanish', 'French'],
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * User model
 * Handles all user-related database operations
 */
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
export type { IUser };
