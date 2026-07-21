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
    logo: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      required: [true, 'Store must have an address'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Store must have a phone number'],
      trim: true,
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
