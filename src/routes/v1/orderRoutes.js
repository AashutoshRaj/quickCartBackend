import express from 'express';
import {
  getOrders,
  getOrderById,
  downloadInvoice,
} from '../../controllers/orderController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

// All order routes require authentication
router.use(protect);

router.get('/', getOrders);
router.get('/:orderId', getOrderById);
router.get('/:orderId/invoice', downloadInvoice);

export default router;
