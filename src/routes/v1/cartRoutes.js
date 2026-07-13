import express from 'express';
import {
  addToCart,
  clearCart,
  decreaseQuantity,
  getCart,
  increaseQuantity,
  removeFromCart,
  updateCartQuantity,
} from '../../controllers/cartController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

router.use(protect);

router.post('/add', addToCart);
router.get('/', getCart);
router.patch('/update/:productId', updateCartQuantity);
router.patch('/quantity/increase/:productId', increaseQuantity);
router.patch('/quantity/decrease/:productId', decreaseQuantity);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
