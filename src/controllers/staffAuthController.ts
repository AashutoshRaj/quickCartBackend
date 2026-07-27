/**
 * Staff Auth Controller
 * Handles login for non-admin staff actors (Security Guards, Employees) used by
 * the customer mobile app's "Staff / Security Guard" entry point. Fully separate
 * from the customer (`User`) and admin auth flows in authController.ts.
 */

import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SecurityGuard from '../models/securityGuardModel.ts';
import Employee from '../models/employeeModel.ts';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';

type StaffActorType = 'guard' | 'employee';

const signStaffToken = (id: string, actorType: StaffActorType): string => {
  return jwt.sign({ id, actorType }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Logs in a Security Guard or Employee by email or Employee ID + password.
 * Tries SecurityGuard first, then Employee, since both share the same
 * "Staff / Security Guard" entry point in the mobile app.
 */
export const staffLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body as { identifier?: string; password?: string };

    if (!identifier || !password) {
      return next(new AppError('identifier and password are required', 400));
    }

    const query = {
      $or: [{ email: identifier.toLowerCase().trim() }, { employeeId: identifier.trim() }],
    };

    let actorType: StaffActorType;
    let account = await SecurityGuard.findOne(query).select('+password');

    if (account) {
      actorType = 'guard';
    } else {
      account = (await Employee.findOne(query).select('+password')) as any;
      actorType = 'employee';
    }

    if (!account) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isActive = actorType === 'guard' ? account.status === 'active' : account.status === 'Active';
    if (!isActive) {
      return next(new AppError('This account is not active. Contact your admin.', 403));
    }

    const isValid = await bcryptjs.compare(password, account.password);
    if (!isValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    account.lastLogin = new Date();
    await account.save();

    const store = await Store.findOne({ storeId: account.storeId }).select('name');

    const token = signStaffToken(String(account._id), actorType);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        actorType,
        id: account._id,
        employeeId: account.employeeId,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: actorType === 'guard' ? 'Security Guard' : (account as any).role,
        shift: actorType === 'guard' ? (account as any).shift : undefined,
        storeId: account.storeId,
        storeName: store?.name || account.storeId,
      },
    });
  } catch (err) {
    next(err);
  }
};
