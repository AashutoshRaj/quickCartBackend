import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
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

const Product = mongoose.model('Product', productSchema);

export default Product;
