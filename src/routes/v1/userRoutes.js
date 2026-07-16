import express from 'express';
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
} from '../../controllers/userController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

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

router.use(protect);

router.get('/profile', getUserProfile);
router.patch('/language', updateLanguage);
router.patch('/notifications', updateNotifications);
router.post('/payment-methods', addPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', deletePaymentMethod);
router.patch('/payment-methods/:paymentMethodId/default', setDefaultPaymentMethod);
router.post('/profile-image', upload.single('profileImage'), uploadProfileImage);
router.delete('/profile-image', deleteProfileImage);

export default router;
