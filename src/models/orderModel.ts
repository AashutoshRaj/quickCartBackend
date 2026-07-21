/**
 * Order Model
 * Represents completed orders with payment and status tracking
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IOrder } from '../types/index';

/**
 * Order schema definition
 * Tracks order details including items, payments, and status
 */
const orderSchema = new Schema<IOrder>(
  {
    sessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    storeId: {
      type: String,
      default: 'default-store',
    },
    storeName: {
      type: String,
      default: 'QuickCart Store',
    },
    storeAddress: {
      type: String,
    },
    storeLogo: {
      type: String,
    },
    items: [
      {
        productId: String,
        name: String,
        productName: String,
        price: Number,
        unitPrice: Number,
        quantity: Number,
        subtotal: Number,
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'refunded', 'exited'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash'],
      default: 'card',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentId: String,
    invoiceUrl: String,
    notes: String,
    exitedAt: Date,
    paidAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

/**
 * Indexes for efficient querying
 */
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

/**
 * Order model
 * Handles all order-related database operations
 */
const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
export type { IOrder };
