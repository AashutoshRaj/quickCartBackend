import mongoose from 'mongoose';
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import AppError from '../utils/appError.js';

const TAX_RATE = 0.05;

const getStoreId = (req) => {
  const rawStoreId =
    req.body?.storeId ||
    req.query?.storeId ||
    req.headers['x-store-id'] ||
    req.headers['x-store'] ||
    'default-store';

  return String(rawStoreId || 'default-store').trim();
};

const recalculateTotals = (cartDoc) => {
  const subtotal = cartDoc.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalItems = cartDoc.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const discount = Number(cartDoc.discount || 0);
  const grandTotal = Number((subtotal + tax - discount).toFixed(2));

  cartDoc.totalItems = totalItems;
  cartDoc.subtotal = Number(subtotal.toFixed(2));
  cartDoc.tax = tax;
  cartDoc.grandTotal = grandTotal;

  return cartDoc;
};

export const getCart = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);

    const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();

    const payload = {
      items: [],
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      discount: 0,
      grandTotal: 0,
      status: 'active',
      storeId,
      _id: undefined,
    };

    if (cart) {
      payload.items = cart.items || [];
      payload.totalItems = cart.totalItems || 0;
      payload.subtotal = cart.subtotal || 0;
      payload.tax = cart.tax || 0;
      payload.discount = cart.discount || 0;
      payload.grandTotal = cart.grandTotal || 0;
      payload.status = cart.status || 'active';
      payload._id = cart._id;
      payload.createdAt = cart.createdAt;
      payload.updatedAt = cart.updatedAt;
    }

    res.status(200).json({
      status: 'success',
      data: { cart: payload },
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);
    const quantity = Number(req.body?.quantity ?? 1);
    const productId = req.body?.productId;

    if (!productId) {
      return next(new AppError('Product ID is required.', 400));
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return next(new AppError('Quantity must be at least 1.', 400));
    }

    const product = await Product.findById(productId);

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    if (product.storeId && String(product.storeId) !== String(storeId)) {
      return next(new AppError('This product does not belong to the selected store.', 409));
    }

    if (Number(product.stock || 0) < quantity) {
      return next(new AppError('Requested quantity exceeds available stock.', 400));
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        let cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);

        if (!cart) {
          cart = new Cart({ customerId, storeId, status: 'active', items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
          (item) => String(item.productId) === String(product._id)
        );

        if (existingItemIndex > -1) {
          const newQuantity = cart.items[existingItemIndex].quantity + quantity;

          if (newQuantity > Number(product.stock || 0)) {
            throw new AppError('Requested quantity exceeds available stock.', 400);
          }

          cart.items[existingItemIndex].quantity = newQuantity;
          cart.items[existingItemIndex].subtotal = Number(
            (cart.items[existingItemIndex].price * newQuantity).toFixed(2)
          );
        } else {
          cart.items.push({
            productId: product._id,
            barcode: product.barcode,
            productName: product.name,
            productImage: product.image,
            price: Number(product.price),
            quantity,
            subtotal: Number((Number(product.price) * quantity).toFixed(2)),
          });
        }

        recalculateTotals(cart);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
      const payload = {
        items: (updatedCart?.items || []).map((item) => ({ ...item, productId: item.productId.toString() })),
        totalItems: updatedCart?.totalItems || 0,
        subtotal: updatedCart?.subtotal || 0,
        tax: updatedCart?.tax || 0,
        discount: updatedCart?.discount || 0,
        grandTotal: updatedCart?.grandTotal || 0,
        status: updatedCart?.status || 'active',
        storeId,
      };

      res.status(200).json({
        status: 'success',
        data: { cart: payload },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

export const updateCartQuantity = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);
    const quantity = Number(req.body?.quantity ?? 1);
    const { productId } = req.params;

    if (!productId) {
      return next(new AppError('Product ID is required.', 400));
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return next(new AppError('Quantity must be at least 1.', 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    if (product.storeId && String(product.storeId) !== String(storeId)) {
      return next(new AppError('This product does not belong to the selected store.', 409));
    }

    if (Number(product.stock || 0) < quantity) {
      return next(new AppError('Requested quantity exceeds available stock.', 400));
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);
        if (!cart) {
          throw new AppError('No active cart found.', 404);
        }

        const item = cart.items.find((entry) => String(entry.productId) === String(productId));
        if (!item) {
          throw new AppError('Product not found in the cart.', 404);
        }

        item.quantity = quantity;
        item.subtotal = Number((item.price * quantity).toFixed(2));
        recalculateTotals(cart);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
      res.status(200).json({
        status: 'success',
        data: { cart: updatedCart },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

export const increaseQuantity = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    if (product.storeId && String(product.storeId) !== String(storeId)) {
      return next(new AppError('This product does not belong to the selected store.', 409));
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);
        if (!cart) {
          throw new AppError('No active cart found.', 404);
        }

        const item = cart.items.find((entry) => String(entry.productId) === String(productId));
        if (!item) {
          throw new AppError('Product not found in the cart.', 404);
        }

        const newQuantity = item.quantity + 1;
        if (newQuantity > Number(product.stock || 0)) {
          throw new AppError('Requested quantity exceeds available stock.', 400);
        }

        item.quantity = newQuantity;
        item.subtotal = Number((item.price * newQuantity).toFixed(2));
        recalculateTotals(cart);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
      res.status(200).json({
        status: 'success',
        data: { cart: updatedCart },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

export const decreaseQuantity = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);
    const { productId } = req.params;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);
        if (!cart) {
          throw new AppError('No active cart found.', 404);
        }

        const itemIndex = cart.items.findIndex((entry) => String(entry.productId) === String(productId));
        if (itemIndex === -1) {
          throw new AppError('Product not found in the cart.', 404);
        }

        const item = cart.items[itemIndex];
        const nextQuantity = item.quantity - 1;

        if (nextQuantity <= 0) {
          cart.items.splice(itemIndex, 1);
        } else {
          item.quantity = nextQuantity;
          item.subtotal = Number((item.price * nextQuantity).toFixed(2));
        }

        recalculateTotals(cart);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
      res.status(200).json({
        status: 'success',
        data: { cart: updatedCart },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);
    const { productId } = req.params;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);
        if (!cart) {
          throw new AppError('No active cart found.', 404);
        }

        cart.items = cart.items.filter((entry) => String(entry.productId) !== String(productId));
        recalculateTotals(cart);
        await cart.save({ session });
      });

      const updatedCart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
      res.status(200).json({
        status: 'success',
        data: { cart: updatedCart },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const storeId = getStoreId(req);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).session(session);
        if (!cart) {
          throw new AppError('No active cart found.', 404);
        }

        cart.items = [];
        cart.totalItems = 0;
        cart.subtotal = 0;
        cart.tax = 0;
        cart.discount = 0;
        cart.grandTotal = 0;
        await cart.save({ session });
      });

      res.status(200).json({
        status: 'success',
        data: { cart: { items: [], totalItems: 0, subtotal: 0, tax: 0, discount: 0, grandTotal: 0 } },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};
