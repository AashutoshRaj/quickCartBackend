import express from 'express';
import { createCheckoutSession, getOrderBySession, completePayment, exitOrder } from '../../controllers/checkoutController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

router.post('/session', protect, createCheckoutSession);
router.get('/order/:sessionId', getOrderBySession);
router.post('/complete', protect, completePayment);
router.post('/exit/:sessionId', exitOrder);

export default router;
