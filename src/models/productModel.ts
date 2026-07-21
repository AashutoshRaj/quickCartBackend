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
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
    },
    description: {
      type: String,
      required: [true, 'A product must have a description'],
    },
    category: {
      type: String,
      required: [true, 'A product must have a category'],
    },
    storeId: {
      type: String,
      default: 'default-store',
      trim: true,
      index: true,
    },
    image: {
      type: String,
      default: 'default-product.jpg',
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Product model
 * Handles all product-related database operations
 */
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);

export default Product;
export type { IProduct };
