import express from 'express';
import {
  checkPhoneNumber,
  completeRegistration,
  sendOTP,
  verifyOTP,
} from '../../controllers/authController.js';


const router = express.Router();

router.post('/check-phone', checkPhoneNumber);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/complete-registration', completeRegistration);

export default router;

