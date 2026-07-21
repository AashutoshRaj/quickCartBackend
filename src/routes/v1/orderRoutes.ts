import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  downloadInvoice,
} from '../../controllers/orderController.ts';
import { protect } from '../../controllers/authController.ts';

const router = Router();

/**
 * All order routes require authentication
 */
router.use(protect);

/**
 * GET /orders
 * Get all orders for authenticated user with pagination (requires authentication)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 10)
 * @query {string} status - Filter by order status
 * @returns {Array} List of user's orders (200)
 */
router.get('/', getOrders);

/**
 * GET /orders/:orderId
 * Get order details by ID (requires authentication)
 * @param {string} orderId - Order ID
 * @returns {object} Complete order details (200)
 */
router.get('/:orderId', getOrderById);

/**
 * GET /orders/:orderId/invoice
 * Download order invoice as PDF (requires authentication)
 * @param {string} orderId - Order ID
 * @returns {File} Invoice PDF file (200)
 */
router.get('/:orderId/invoice', downloadInvoice);

export default router;
