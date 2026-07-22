/**
 * Product Model
 * Represents product catalog with pricing and inventory
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IProduct } from '../types/index';

/**
 * Product schema definition
 * Stores product information including barcode, pricing, and inventory
 */
const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'A product must have a name'],
      trim: true,
    },
    barcode: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'A product must have a category'],
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      default: 'piece',
      trim: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'],
    },
    storeId: {
      type: String,
      required: [true, 'Product must belong to a store'],
      trim: true,
      index: true,
    },
    image: {
      type: String,
      default: '',
    },
    stock: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
    },
    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ storeId: 1, barcode: 1 }, { sparse: true });
productSchema.index({ storeId: 1, sku: 1 }, { sparse: true });
productSchema.index({ storeId: 1, category: 1 });

/**
 * Product model
 * Handles all product-related database operations
 */
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);

export default Product;
export type { IProduct };
