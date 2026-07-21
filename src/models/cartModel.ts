/**
 * Cart Model
 * Represents shopping cart with items and pricing calculations
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { ICart, ICartItem } from '../types/index';

/**
 * Cart item sub-schema
 * Represents individual items in a cart
 */
const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'A cart item must reference a product'],
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      required: [true, 'A cart item must have a product name'],
      trim: true,
    },
    productImage: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'A cart item must have a price'],
      min: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'A cart item must have a quantity'],
      min: 1,
      default: 1,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

/**
 * Cart schema definition
 * Handles shopping cart state including items, pricing, and status
 */
const cartSchema = new Schema<ICart>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A cart must belong to a customer'],
      index: true,
    },
    storeId: {
      type: String,
      required: [true, 'A cart must belong to a store'],
      trim: true,
      index: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'checked_out'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound index for active carts per customer and store
 * Ensures only one active cart per customer per store
 */
cartSchema.index(
  { customerId: 1, storeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);

/**
 * Cart model
 * Handles all shopping cart operations
 */
const Cart: Model<ICart> = mongoose.model<ICart>('Cart', cartSchema);

export default Cart;
export type { ICart, ICartItem };
