import express from 'express';
import { createCheckoutSession } from '../../controllers/checkoutController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

router.post('/session', protect, createCheckoutSession);

export default router;
