import Stripe from 'stripe';
import Cart from '../models/cartModel.js';
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

    res.status(200).json({
      status: 'success',
      data: { checkoutSessionId: session.id, url: session.url },
    });
  } catch (error) {
    next(error);
  }
};
