/**
 * Staff Auth Middleware
 * Verifies the staff (Security Guard / Employee) JWT issued by staffAuthController.ts
 * and attaches the actor to `req.staffActor`. Fully separate from the customer/admin
 * `protect` middleware in authController.ts, which only knows about the `User` collection.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import SecurityGuard from '../models/securityGuardModel.ts';
import Employee from '../models/employeeModel.ts';
import AppError from '../utils/appError.ts';
import type { StaffActor } from '../types/index';

export type StaffActorType = StaffActor['actorType'];

/**
 * Requires only that the caller be an authenticated, active staff actor
 * (Security Guard or Employee) — either actor type may pass.
 */
export const protectStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('You are not logged in. Please log in to continue.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; actorType: StaffActorType };

    const account =
      decoded.actorType === 'guard'
        ? await SecurityGuard.findById(decoded.id)
        : await Employee.findById(decoded.id);

    if (!account) {
      return next(new AppError('The account belonging to this token no longer exists.', 401));
    }

    const isActive = decoded.actorType === 'guard' ? account.status === 'active' : account.status === 'Active';
    if (!isActive) {
      return next(new AppError('This account is not active. Contact your admin.', 403));
    }

    req.staffActor = {
      actorType: decoded.actorType,
      id: String(account._id),
      employeeId: account.employeeId,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      storeId: account.storeId,
      status: account.status,
    };

    next();
  } catch {
    next(new AppError('Invalid or expired session. Please log in again.', 401));
  }
};

/**
 * Restricts access to Security Guard accounts only — Employee accounts are
 * rejected even though they can still authenticate via /staff/auth/login.
 */
export const requireGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (req.staffActor?.actorType !== 'guard') {
    return next(new AppError('Security Guard access required.', 403));
  }
  next();
};
