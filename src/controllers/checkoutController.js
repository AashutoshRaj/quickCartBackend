import Stripe from 'stripe';
import Cart from '../models/cartModel.js';
import Order from '../models/orderModel.js';
import AppError from '../utils/appError.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

export const createCheckoutSession = async (req, res, next) => {
  try {
    const customerId = req.user?._id;
    const storeId = req.body?.storeId || req.query?.storeId || 'default-store';

    if (!customerId) {
      return next(new AppError('You must be logged in to checkout.', 401));
    }

    const cart = await Cart.findOne({ customerId, storeId, status: 'active' }).lean();
    if (!cart || !cart.items?.length) {
      return next(new AppError('Your cart is empty.', 400));
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
      storeName: cart.storeName || 'QuickCart Store',
      storeAddress: cart.storeAddress,
      items: cart.items.map(item => ({
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

export const getOrderBySession = async (req, res, next) => {
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
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const completePayment = async (req, res, next) => {
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

export const exitOrder = async (req, res, next) => {
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
