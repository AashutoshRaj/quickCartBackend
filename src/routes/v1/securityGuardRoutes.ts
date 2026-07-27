import { Router, Response, NextFunction } from 'express';
import { protect } from '../../controllers/authController.ts';
import {
  createSecurityGuard,
  getSecurityGuards,
  getSecurityGuardStats,
  getSecurityGuard,
  updateSecurityGuard,
  toggleSecurityGuardStatus,
  resetSecurityGuardPassword,
  deleteSecurityGuard,
  sendSecurityGuardCredentials,
} from '../../controllers/securityGuardController.ts';

const router = Router();

/**
 * Admin authentication middleware - verify user is admin
 */
const adminAuth = (req: any, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

/**
 * All security guard routes require authentication and admin role
 */
router.use(protect, adminAuth);

/** GET /security-guards/stats - dashboard summary stats */
router.get('/stats', getSecurityGuardStats);

/** GET /security-guards, POST /security-guards */
router.route('/').get(getSecurityGuards).post(createSecurityGuard);

/** GET /security-guards/:id, PATCH /security-guards/:id, DELETE /security-guards/:id */
router.route('/:id').get(getSecurityGuard).patch(updateSecurityGuard).delete(deleteSecurityGuard);

/** PATCH /security-guards/:id/status - toggle active/inactive */
router.patch('/:id/status', toggleSecurityGuardStatus);

/** PATCH /security-guards/:id/reset-password */
router.patch('/:id/reset-password', resetSecurityGuardPassword);

/** POST /security-guards/:id/send-credentials */
router.post('/:id/send-credentials', sendSecurityGuardCredentials);

export default router;
