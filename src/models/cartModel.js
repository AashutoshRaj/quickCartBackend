import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
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

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
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

cartSchema.index(
  { customerId: 1, storeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
