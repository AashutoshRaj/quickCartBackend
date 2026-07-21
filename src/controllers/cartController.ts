/**
 * Cart Controller
 * Handles shopping cart operations including add, update, remove items
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/cartModel.ts';
import Product from '../models/productModel.ts';
import AppError from '../utils/appError.ts';
import type { ICart, ICartItem } from '../types/index';

const TAX_RATE = 0.05;

/**
 * Response type for cart operations
 */
interface CartResponse {
  status: string;
  data: { cart: Partial<ICart> };
}

/**
 * Request body for cart operations
 */
interface CartUpdateRequest {
  quantity?: number;
  productId?: string;
  storeId?: string;
}

/**
 * Extracts store ID from request (body, query, or headers)
 * @param req - Express request
 * @returns Store ID string
 */
const getStoreId = (req: Request): string => {
  const rawStoreId =
    (req.body as Record<string, unknown>)?.storeId ||
    req.query?.storeId ||
    req.headers['x-store-id'] ||
    req.headers['x-store'] ||
    'default-store';

  return String(rawStoreId || 'default-store').trim();
};

/**
 * Recalculates cart totals (subtotal, tax, grand total)
 * @param cartDoc - Cart document
 * @returns Updated cart document
 */
const recalculateTotals = (cartDoc: ICart): ICart => {
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

/**
 * Retrieves the active cart for the current user and store
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const getCart = async (
  req: Request,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const storeId = getStoreId(req);

    const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();

    const payload: Partial<ICart> = {
      items: [],
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      discount: 0,
      grandTotal: 0,
      status: 'active',
      storeId,
    };

    if (cart) {
      payload.items = cart.items || [];
      payload.totalItems = cart.totalItems || 0;
      payload.subtotal = cart.subtotal || 0;
      payload.tax = cart.tax || 0;
      payload.discount = cart.discount || 0;
      payload.grandTotal = cart.grandTotal || 0;
      payload.status = cart.status || 'active';
      payload._id = (cart as unknown as Record<string, unknown>)._id;
      payload.createdAt = (cart as unknown as Record<string, unknown>).createdAt as Date;
      payload.updatedAt = (cart as unknown as Record<string, unknown>).updatedAt as Date;
    }

    res.status(200).json({
      status: 'success',
      data: { cart: payload },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adds a product to the user's cart
 * Creates new cart if none exists, handles stock validation
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found or insufficient stock
 */
export const addToCart = async (
  req: Request<never, CartResponse, CartUpdateRequest>,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
      const payload: Partial<ICart> = {
        items: (updatedCart?.items || []).map((item) => ({
          ...item,
          productId: item.productId.toString(),
        })),
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

/**
 * Updates the quantity of a product in the cart
 * @param req - Express request with product ID in params and new quantity in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found in cart or insufficient stock
 */
export const updateCartQuantity = async (
  req: Request<{ productId: string }, CartResponse, CartUpdateRequest>,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
        data: { cart: updatedCart as Partial<ICart> },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Increases the quantity of a product in the cart by 1
 * @param req - Express request with product ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found in cart or insufficient stock
 */
export const increaseQuantity = async (
  req: Request<{ productId: string }, CartResponse>,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
        data: { cart: updatedCart as Partial<ICart> },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Decreases the quantity of a product in the cart by 1
 * Removes item if quantity becomes 0
 * @param req - Express request with product ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found in cart
 */
export const decreaseQuantity = async (
  req: Request<{ productId: string }, CartResponse>,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
        data: { cart: updatedCart as Partial<ICart> },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Removes a product from the cart completely
 * @param req - Express request with product ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found in cart
 */
export const removeFromCart = async (
  req: Request<{ productId: string }, CartResponse>,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
        data: { cart: updatedCart as Partial<ICart> },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Clears all items from the cart
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if no active cart found
 */
export const clearCart = async (
  req: Request,
  res: Response<CartResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
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
        data: {
          cart: {
            items: [],
            totalItems: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
            grandTotal: 0,
          },
        },
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};
