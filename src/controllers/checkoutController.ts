/**
 * Checkout Controller
 * Handles payment checkout, order creation, and payment completion
 */

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import Cart from '../models/cartModel.ts';
import Order from '../models/orderModel.ts';
import Product from '../models/productModel.ts';
import AppError from '../utils/appError.ts';
import type { IOrder } from '../types/index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

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
    const storeId = req.body?.storeId || (req.query?.storeId as string) || 'default-store';

    if (!customerId) {
      return next(new AppError('You must be logged in to checkout.', 401));
    }

    const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
    if (!cart || !cart.items?.length) {
      return next(new AppError('Your cart is empty.', 400));
    }

    // Validate all cart items belong to this store
    const cartProductIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: cartProductIds } }).lean();

    const invalidProducts = products.filter((p) => p.storeId && String(p.storeId) !== String(storeId));
    if (invalidProducts.length > 0) {
      return next(new AppError('Cart contains products from a different store. Please clear cart and start over.', 409));
    }

    const line_items = cart.items.map((item) => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.productName,
          images: item.productImage ? [item.productImage] : [],
        },
        unit_amount: Math.round(Number(item.price || 0) * 100),
      },
      quantity: Number(item.quantity || 1),
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel`,
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
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const discount = Number(cart.discount || 0);
    const total = Number((subtotal + tax - discount).toFixed(2));

    const order = await Order.create({
      sessionId: session.id,
      customerId,
      storeId,
      storeName: (cart as unknown as Record<string, unknown>).storeName || 'QuickCart Store',
      storeAddress: (cart as unknown as Record<string, unknown>).storeAddress,
      items: cart.items.map((item) => ({
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

    const order = await Order.findOneAndUpdate(
      { sessionId },
      {
        status: 'completed',
        paymentStatus: 'completed',
        completedAt: new Date(),
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment completed',
      data: order,
    });
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
