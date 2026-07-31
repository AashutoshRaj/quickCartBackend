import { Router } from 'express';
import {
  createCheckoutSession,
  getOrderBySession,
  completePayment,
  cancelCheckout,
  exitOrder,
} from '../../controllers/checkoutController.ts';
import { protect } from '../../controllers/authController.ts';

const router = Router();

/**
 * POST /checkout/session
 * Create checkout session for payment processing (requires authentication)
 * @param {object} sessionData - Checkout session details
 * @returns {object} Checkout session with payment URL (201)
 */
router.post('/session', protect, createCheckoutSession);

/**
 * GET /checkout/order/:sessionId
 * Get order details by session ID
 * @param {string} sessionId - Checkout session ID
 * @returns {object} Order details (200)
 */
router.get('/order/:sessionId', getOrderBySession);

/**
 * POST /checkout/complete
 * Complete payment and finalize order (requires authentication)
 * @param {string} sessionId - Checkout session ID
 * @param {object} paymentData - Payment completion data
 * @returns {object} Completed order (200)
 */
router.post('/complete', protect, completePayment);

/**
 * POST /checkout/cancel/:sessionId
 * Cancel a pending checkout. No stock is released because stock is decremented
 * only after successful payment completion.
 */
router.post('/cancel/:sessionId', protect, cancelCheckout);

/**
 * POST /checkout/exit/:sessionId
 * Exit checkout session without completing purchase
 * @param {string} sessionId - Checkout session ID to exit
 * @returns {object} Session exit confirmation (200)
 */
router.post('/exit/:sessionId', exitOrder);

export default router;
