/**
 * Store Model
 * Represents physical store locations with configuration
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IStore } from '../types/index';

/**
 * Store schema definition
 * Stores information about physical store locations
 */
const storeSchema = new Schema<IStore>(
  {
    storeId: {
      type: String,
      required: [true, 'Store must have a storeId'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Store must have a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Store must have an email'],
      trim: true,
      lowercase: true,
    },
    logo: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      required: [true, 'Store must have an address'],
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
    phoneNumber: {
      type: String,
      required: [true, 'Store must have a phone number'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      required: [true, 'Store must have a currency'],
      enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'],
      default: 'USD',
    },
    timezone: {
      type: String,
      required: [true, 'Store must have a timezone'],
      default: 'UTC',
    },
    businessHours: {
      type: [{
        day: String,
        open: Boolean,
        from: String,
        to: String,
      }],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'closed'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },
    qrCode: {
      type: String,
      default: null,
    },
    qrGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Store model
 * Handles all store configuration and lookup operations
 */
const Store: Model<IStore> = mongoose.model<IStore>('Store', storeSchema);

export default Store;
export type { IStore };
