import { Router } from 'express';
import { protectStaff } from '../../middleware/protectStaff.ts';
import {
  getStaffProfile,
  getStaffDashboardStats,
  verifyExitQr,
  approveExit,
} from '../../controllers/staffVerificationController.ts';

const router = Router();

/**
 * All routes below require a valid staff (Security Guard / Employee) session
 */
router.use(protectStaff);

/** GET /staff/profile */
router.get('/profile', getStaffProfile);

/** GET /staff/dashboard/stats */
router.get('/dashboard/stats', getStaffDashboardStats);

/** POST /staff/verify — scan-check, no mutation */
router.post('/verify', verifyExitQr);

/** POST /staff/verify/:sessionId/approve */
router.post('/verify/:sessionId/approve', approveExit);

export default router;
