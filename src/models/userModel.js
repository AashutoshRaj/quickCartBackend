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
          type: mongoose.Schema.Types.ObjectId,
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

const User = mongoose.model('User', userSchema);

export default User;

