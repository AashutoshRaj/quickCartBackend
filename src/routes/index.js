import express from 'express';
import authRoutes from './v1/authRoutes.js';
import productRoutes from './v1/productRoutes.js';

const router = express.Router();

// Register v1 routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

export default router;
