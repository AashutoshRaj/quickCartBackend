import { Router } from 'express';
import multer from 'multer';
import {
  getUserProfile,
  updateLanguage,
  updateNotifications,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  uploadProfileImage,
  deleteProfileImage,
} from '../../controllers/userController.ts';
import { protect } from '../../controllers/authController.ts';

const router = Router();

/**
 * Configure multer for profile image uploads
 * Max file size: 5MB, stored in public/uploads/temp
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads/temp');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * All user routes require authentication
 */
router.use(protect);

/**
 * GET /users/profile
 * Get authenticated user's profile (requires authentication)
 * @returns {object} User profile details (200)
 */
router.get('/profile', getUserProfile);

/**
 * PATCH /users/language
 * Update user's preferred language (requires authentication)
 * @param {string} language - Language code (e.g., 'en', 'es', 'fr')
 * @returns {object} Updated user profile (200)
 */
router.patch('/language', updateLanguage);

/**
 * PATCH /users/notifications
 * Update user's notification preferences (requires authentication)
 * @param {object} notificationSettings - Notification configuration
 * @returns {object} Updated notification settings (200)
 */
router.patch('/notifications', updateNotifications);

/**
 * POST /users/payment-methods
 * Add new payment method to user account (requires authentication)
 * @param {object} paymentData - Payment method details
 * @returns {object} Added payment method (201)
 */
router.post('/payment-methods', addPaymentMethod);

/**
 * DELETE /users/payment-methods/:paymentMethodId
 * Remove payment method from user account (requires authentication)
 * @param {string} paymentMethodId - Payment method ID to delete
 * @returns {object} Deletion confirmation (200)
 */
router.delete('/payment-methods/:paymentMethodId', deletePaymentMethod);

/**
 * PATCH /users/payment-methods/:paymentMethodId/default
 * Set payment method as default for user (requires authentication)
 * @param {string} paymentMethodId - Payment method ID to set as default
 * @returns {object} Updated default payment method (200)
 */
router.patch('/payment-methods/:paymentMethodId/default', setDefaultPaymentMethod);

/**
 * POST /users/profile-image
 * Upload user profile image (requires authentication)
 * Accepts multipart/form-data with 'profileImage' field
 * Max file size: 5MB
 * @param {File} profileImage - Profile image file
 * @returns {object} Uploaded image details (201)
 */
router.post('/profile-image', upload.single('profileImage'), uploadProfileImage);

/**
 * DELETE /users/profile-image
 * Remove user profile image (requires authentication)
 * @returns {object} Deletion confirmation (200)
 */
router.delete('/profile-image', deleteProfileImage);

export default router;
