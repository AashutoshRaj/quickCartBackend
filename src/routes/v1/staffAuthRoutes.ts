import { Router } from 'express';
import { staffLogin } from '../../controllers/staffAuthController.ts';

const router = Router();

/**
 * POST /staff/auth/login
 * Public login endpoint for Security Guards and Employees (mobile app)
 */
router.post('/login', staffLogin);

export default router;
