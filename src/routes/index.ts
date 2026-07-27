import { Router } from 'express';
import authRoutes from './v1/authRoutes.ts';
import productRoutes from './v1/productRoutes.ts';
import cartRoutes from './v1/cartRoutes.ts';
import checkoutRoutes from './v1/checkoutRoutes.ts';
import orderRoutes from './v1/orderRoutes.ts';
import userRoutes from './v1/userRoutes.ts';
import storeRoutes from './v1/storeRoutes.ts';
import adminRoutes from './v1/adminRoutes.ts';
import importRoutes from './v1/importRoutes.ts';
import securityGuardRoutes from './v1/securityGuardRoutes.ts';
import employeeRoutes from './v1/employeeRoutes.ts';
import staffAuthRoutes from './v1/staffAuthRoutes.ts';
import staffRoutes from './v1/staffRoutes.ts';

const router = Router();

/**
 * Mount v1 API routes
 * All routes are prefixed with /api/v1
 */

/**
 * POST /auth/*
 * Authentication routes for customer and admin authentication
 */
router.use('/auth', authRoutes);

/**
 * GET/POST /products
 * Product management routes
 */
router.use('/products', productRoutes);

/**
 * GET/POST/PATCH /cart
 * Shopping cart management routes
 */
router.use('/cart', cartRoutes);

/**
 * POST/GET /checkout
 * Checkout and payment processing routes
 */
router.use('/checkout', checkoutRoutes);

/**
 * GET /orders
 * Order retrieval and management routes
 */
router.use('/orders', orderRoutes);

/**
 * GET/PATCH /users
 * User profile and settings routes
 */
router.use('/users', userRoutes);

/**
 * GET/POST/PATCH/DELETE /stores
 * Store management routes
 */
router.use('/stores', storeRoutes);

/**
 * GET/POST/PATCH/DELETE /admin
 * Admin dashboard and management routes (requires authentication)
 */
router.use('/admin', adminRoutes);

/**
 * POST/GET /imports
 * Bulk import management routes
 */
router.use('/imports', importRoutes);

/**
 * GET/POST/PATCH/DELETE /security-guards
 * Security Guard account management routes (admin only)
 */
router.use('/security-guards', securityGuardRoutes);

/**
 * GET/POST/PATCH/DELETE /employees
 * Staff employee account management routes (admin only)
 */
router.use('/employees', employeeRoutes);

/**
 * POST /staff/auth/login
 * Staff (Security Guard / Employee) mobile app login (public)
 */
router.use('/staff/auth', staffAuthRoutes);

/**
 * GET/POST /staff/*
 * Security Guard exit-verification routes (requires staff session)
 */
router.use('/staff', staffRoutes);

export default router;
