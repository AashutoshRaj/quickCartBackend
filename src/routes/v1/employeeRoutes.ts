import { Router, Response, NextFunction } from 'express';
import { protect } from '../../controllers/authController.ts';
import {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
  deleteEmployee,
  sendEmployeeCredentials,
} from '../../controllers/employeeController.ts';

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
 * All employee routes require authentication and admin role
 */
router.use(protect, adminAuth);

/** GET /employees, POST /employees */
router.route('/').get(getEmployees).post(createEmployee);

/** GET /employees/:id, PATCH /employees/:id, DELETE /employees/:id */
router.route('/:id').get(getEmployee).patch(updateEmployee).delete(deleteEmployee);

/** PATCH /employees/:id/status - cycle Active/On Leave/Inactive */
router.patch('/:id/status', toggleEmployeeStatus);

/** PATCH /employees/:id/reset-password */
router.patch('/:id/reset-password', resetEmployeePassword);

/** POST /employees/:id/send-credentials */
router.post('/:id/send-credentials', sendEmployeeCredentials);

export default router;
