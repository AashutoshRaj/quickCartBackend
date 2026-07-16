import express from 'express';
import authRoutes from './v1/authRoutes.js';
import productRoutes from './v1/productRoutes.js';
import cartRoutes from './v1/cartRoutes.js';
import checkoutRoutes from './v1/checkoutRoutes.js';
import orderRoutes from './v1/orderRoutes.js';
import userRoutes from './v1/userRoutes.js';

const router = express.Router();

// Register v1 routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);

export default router;
