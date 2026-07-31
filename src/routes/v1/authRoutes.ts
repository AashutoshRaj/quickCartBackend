import { Router } from 'express';
import {
  checkPhoneNumber,
  completeRegistration,
  sendOTP,
  verifyOTP,
  protect,
} from '../../controllers/authController.ts';
import {
  adminSignup,
  adminLogin,
  getAdminMe,
  adminLogout,
} from '../../controllers/adminAuthController.ts';
import { authLimiter } from '../../middleware/authLimiter.ts';

const router = Router();

/**
 * POST /auth/check-phone
 * Check if phone number exists in the system
 * @param {string} phoneNumber - User's phone number
 * @returns {object} Phone validation result
 */
router.post('/check-phone', authLimiter, checkPhoneNumber);

/**
 * POST /auth/send-otp
 * Send OTP to customer's phone number
 * @param {string} phoneNumber - Recipient phone number
 * @returns {object} OTP sent confirmation
 */
router.post('/send-otp', authLimiter, sendOTP);

/**
 * POST /auth/verify-otp
 * Verify OTP code sent to customer
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} otp - OTP code to verify
 * @returns {object} Verification result with token
 */
router.post('/verify-otp', authLimiter, verifyOTP);

/**
 * POST /auth/complete-registration
 * Complete customer registration after OTP verification
 * @param {object} userData - User data to complete registration
 * @returns {object} Registered user with auth token
 */
router.post('/complete-registration', authLimiter, completeRegistration);

/**
 * POST /auth/signup
 * Admin user signup (public route, no auth required)
 * @param {object} adminData - Admin email and password
 * @returns {object} Created admin user and auth token
 */
router.post('/signup', authLimiter, adminSignup);

/**
 * POST /auth/login
 * Admin user login (public route, no auth required)
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {object} Admin user and auth token (200)
 */
router.post('/login', authLimiter, adminLogin);

/**
 * GET /auth/me
 * Get authenticated admin's profile (requires auth)
 * @returns {object} Authenticated admin user profile (200)
 */
router.get('/me', protect, getAdminMe);

/**
 * POST /auth/logout
 * Logout authenticated admin user (requires auth)
 * @returns {object} Logout confirmation (200)
 */
router.post('/logout', protect, adminLogout);

export default router;
