import { Router } from 'express';
import {
  addToCart,
  clearCart,
  decreaseQuantity,
  getCart,
  increaseQuantity,
  removeFromCart,
  updateCartQuantity,
} from '../../controllers/cartController.ts';
import { protect } from '../../controllers/authController.ts';

const router = Router();

/**
 * All cart routes require authentication
 */
router.use(protect);

/**
 * POST /cart/add
 * Add item to cart (requires authentication)
 * @param {string} productId - Product ID to add
 * @param {number} quantity - Quantity to add
 * @returns {object} Updated cart (200)
 */
router.post('/add', addToCart);

/**
 * GET /cart
 * Get current user's cart (requires authentication)
 * @returns {object} Cart with items (200)
 */
router.get('/', getCart);

/**
 * PATCH /cart/update/:productId
 * Update product quantity in cart (requires authentication)
 * @param {string} productId - Product ID to update
 * @param {number} quantity - New quantity
 * @returns {object} Updated cart (200)
 */
router.patch('/update/:productId', updateCartQuantity);

/**
 * PATCH /cart/quantity/increase/:productId
 * Increase product quantity by 1 (requires authentication)
 * @param {string} productId - Product ID to increase
 * @returns {object} Updated cart (200)
 */
router.patch('/quantity/increase/:productId', increaseQuantity);

/**
 * PATCH /cart/quantity/decrease/:productId
 * Decrease product quantity by 1 (requires authentication)
 * @param {string} productId - Product ID to decrease
 * @returns {object} Updated cart (200)
 */
router.patch('/quantity/decrease/:productId', decreaseQuantity);

/**
 * DELETE /cart/remove/:productId
 * Remove product from cart (requires authentication)
 * @param {string} productId - Product ID to remove
 * @returns {object} Updated cart (200)
 */
router.delete('/remove/:productId', removeFromCart);

/**
 * DELETE /cart/clear
 * Clear entire cart (requires authentication)
 * @returns {object} Cleared cart confirmation (200)
 */
router.delete('/clear', clearCart);

export default router;
