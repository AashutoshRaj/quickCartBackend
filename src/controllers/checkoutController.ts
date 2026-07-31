/**
 * Checkout Controller
 * Handles payment checkout, order creation, and payment completion
 */

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import Cart from '../models/cartModel.ts';
import Order from '../models/orderModel.ts';
import Product from '../models/productModel.ts';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';
import type { ICart, ICartItem, IOrder } from '../types/index.ts';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

const normalizeFrontendUrl = (value: string): string => value.trim().replace(/\/$/, '');

const getValidImageUrl = (value?: string): string | undefined => {
  if (!value) return undefined;

  try {
    const imageUrl = new URL(value);
    return imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:'
      ? imageUrl.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

const getCheckoutFrontendUrl = (req: Request): string => {
  const configuredUrls = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeFrontendUrl)
    .filter(Boolean);

  const supportedUrls = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://quick-cart-shop-two.vercel.app',
    ...configuredUrls,
  ]);

  const requestOrigin = req.headers.origin;
  if (requestOrigin && supportedUrls.has(normalizeFrontendUrl(requestOrigin))) {
    return normalizeFrontendUrl(requestOrigin);
  }

  return configuredUrls[0] || 'http://localhost:5173';
};

/**
 * Request body for checkout operations
 */
interface CheckoutRequest {
  storeId?: string;
  sessionId?: string;
}

/**
 * Response type for checkout creation
 */
interface CheckoutResponse {
  status: string;
  data: {
    checkoutSessionId: string;
    url: string | null;
  };
}

/**
 * Response type for order operations
 */
interface OrderResponse {
  status: string;
  message?: string;
  data: IOrder;
}

/**
 * Creates a Stripe checkout session and initializes an order
 * @param req - Express request with cart and store information
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if user not logged in or cart is empty
 */
export const createCheckoutSession = async (
  req: Request<never, CheckoutResponse, CheckoutRequest>,
  res: Response<CheckoutResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const storeId = req.body?.storeId || (req.query?.storeId as string);

    if (!customerId) {
      return next(new AppError('You must be logged in to checkout.', 401));
    }

    if (!storeId) {
      return next(new AppError('Store ID is required to checkout.', 400));
    }

    const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean<ICart>();
    if (!cart || !cart.items?.length) {
      return next(new AppError('Your cart is empty.', 400));
    }

    // Always resolve the store name/address from the store the customer is
    // actually shopping at - never trust a hardcoded default or stale cart field
    const storeDoc = await Store.findOne({ storeId }).lean();
    if (!storeDoc) {
      return next(new AppError('Store not found for this checkout session.', 404));
    }

    // Validate all cart items belong to this store
    const cartProductIds = cart.items.map((item: ICartItem) => item.productId);
    const products = await Product.find({ _id: { $in: cartProductIds } }).lean();

    const invalidProducts = products.filter((p) => p.storeId && String(p.storeId) !== String(storeId));
    if (invalidProducts.length > 0) {
      return next(new AppError('Cart contains products from a different store. Please clear cart and start over.', 409));
    }

    const currencyCode = (storeDoc.currency || 'USD').toLowerCase();

    const line_items = cart.items.map((item: ICartItem) => ({
      price_data: {
        currency: currencyCode,
        product_data: {
          name: item.productName,
          ...(getValidImageUrl(item.productImage)
            ? { images: [getValidImageUrl(item.productImage)] }
            : {}),
        },
        unit_amount: Math.round(Number(item.price || 0) * 100),
      },
      quantity: Number(item.quantity || 1),
    }));

    const frontendUrl = getCheckoutFrontendUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment-cancel`,
      customer_email: req.user?.email || undefined,
      metadata: {
        customerId: String(customerId),
        storeId: String(storeId),
        cartId: String(cart._id || ''),
      },
      payment_method_types: ['card', 'link'],
    });

    // Calculate order totals
    const TAX_RATE = 0.05;
    const subtotal = cart.items.reduce(
      (sum: number, item: ICartItem) => sum + (item.price * item.quantity),
      0
    );
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const discount = Number(cart.discount || 0);
    const total = Number((subtotal + tax - discount).toFixed(2));

    const order = await Order.create({
      sessionId: session.id,
      customerId,
      storeId,
      storeName: storeDoc.name,
      storeAddress: storeDoc.address,
      currency: storeDoc.currency || 'USD',
      items: cart.items.map((item: ICartItem) => ({
        productId: item.productId,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      discount,
      total,
      totalAmount: total,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'card',
    });

    res.status(200).json({
      status: 'success',
      data: { checkoutSessionId: session.id, url: session.url },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves an order by Stripe session ID
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if session ID is missing or order not found
 */
export const getOrderBySession = async (
  req: Request<{ sessionId: string }, OrderResponse>,
  res: Response<OrderResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return next(new AppError('Session ID is required.', 400));
    }

    const order = await Order.findOne({ sessionId }).lean();

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: order as IOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks an order as completed after successful payment
 * @param req - Express request with session ID in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if session ID is missing or order not found
 */
export const completePayment = async (
  req: Request<never, OrderResponse, CheckoutRequest>,
  res: Response<OrderResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new AppError('Session ID is required.', 400));
    }

    const customerId = req.user?._id;
    const session = await mongoose.startSession();
    let completedOrder: IOrder | null = null;

    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({ sessionId, customerId }).session(session);

        if (!order) {
          throw new AppError('Order not found.', 404);
        }

        // Payment success pages can be revisited. Do not decrement stock twice.
        if (order.paymentStatus === 'completed' || order.status === 'completed') {
          completedOrder = order.toObject() as IOrder;
          return;
        }

        if (order.status !== 'pending' || order.paymentStatus !== 'pending') {
          throw new AppError('This order is no longer available for payment completion.', 409);
        }

        for (const item of order.items) {
          const quantity = Number(item.quantity || 0);
          if (quantity < 1) continue;

          const updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              storeId: order.storeId,
              status: { $ne: 'discontinued' },
              stock: { $gte: quantity },
            },
            { $inc: { stock: -quantity } },
            { new: true, session }
          );

          if (!updatedProduct) {
            const currentProduct = await Product.findOne({
              _id: item.productId,
              storeId: order.storeId,
            }).select('name stock').session(session).lean();
            const available = Number(currentProduct?.stock || 0);
            throw new AppError(
              available > 0
                ? `Only ${available} item${available === 1 ? '' : 's'} available for ${item.name || 'this product'}.`
                : `${item.name || 'This product'} is out of stock.`,
              409
            );
          }
        }

        order.status = 'completed';
        order.paymentStatus = 'completed';
        order.completedAt = new Date();
        order.paidAt = new Date();
        await order.save({ session });
        completedOrder = order.toObject() as IOrder;
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment completed',
      data: completedOrder as IOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancels a pending checkout without changing inventory.
 * Stock is only decremented after payment completion, so a pending cancellation
 * releases no stock and is safe to retry.
 */
export const cancelCheckout = async (
  req: Request<{ sessionId: string }, OrderResponse>,
  res: Response<OrderResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const customerId = req.user?._id;

    if (!sessionId) {
      return next(new AppError('Session ID is required.', 400));
    }

    const order = await Order.findOneAndUpdate(
      { sessionId, customerId, status: 'pending', paymentStatus: 'pending' },
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    );

    if (!order) {
      const existingOrder = await Order.findOne({ sessionId, customerId });
      if (!existingOrder) return next(new AppError('Order not found.', 404));
      return res.status(200).json({ status: 'success', message: 'Checkout already finalized.', data: existingOrder });
    }

    res.status(200).json({ status: 'success', message: 'Checkout cancelled.', data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks an order as exited (user cancelled checkout)
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if session ID is missing or order not found
 */
export const exitOrder = async (
  req: Request<{ sessionId: string }, OrderResponse>,
  res: Response<OrderResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return next(new AppError('Session ID is required.', 400));
    }

    const order = await Order.findOneAndUpdate(
      { sessionId },
      {
        status: 'exited',
        exitedAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Exit confirmed',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
