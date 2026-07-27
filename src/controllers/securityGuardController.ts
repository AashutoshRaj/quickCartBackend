/**
 * Security Guard Controller
 * Handles Security Guard account CRUD, credential generation and delivery,
 * scoped to the authenticated admin's own store
 */

import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import SecurityGuard from '../models/securityGuardModel.ts';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';
import { getAuthenticatedStoreId } from '../utils/getAuthenticatedStore.ts';
import { generateGuardEmployeeId, generateTempPassword } from '../utils/credentialGenerator.ts';
import { sendGuardCredentialsEmail } from '../utils/mailer.ts';
import { sendGuardCredentialsSms } from '../utils/smsSender.ts';
import type { ISecurityGuard } from '../types/index';

interface SingleGuardResponse {
  status: string;
  data: { guard: Partial<ISecurityGuard> };
}

interface GuardsListResponse {
  status: string;
  results: number;
  data: { guards: Partial<ISecurityGuard>[] };
}

/**
 * Creates a new Security Guard, scoped to the authenticated admin's store.
 * Generates a sequential employeeId and a temporary password, returning
 * the plaintext password once so the admin can share it with the guard.
 */
export const createSecurityGuard = async (
  req: Request,
  res: Response<SingleGuardResponse & { data: { guard: Partial<ISecurityGuard>; tempPassword: string } }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { firstName, lastName, mobileNumber, email, shift, joiningDate, employeeCode, photo, status } =
      req.body;

    if (!firstName || !lastName || !mobileNumber || !email || !shift) {
      return next(
        new AppError('firstName, lastName, mobileNumber, email and shift are required', 400)
      );
    }

    const employeeId = await generateGuardEmployeeId();
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 10);

    const guard = await SecurityGuard.create({
      employeeId,
      firstName,
      lastName,
      photo: photo || null,
      mobileNumber,
      email,
      password: hashedPassword,
      storeId,
      shift,
      joiningDate: joiningDate || Date.now(),
      employeeCode,
      status: status === 'inactive' ? 'inactive' : 'active',
      createdBy: (req as any).user._id,
    });

    const guardObj = guard.toObject();
    delete (guardObj as any).password;

    res.status(201).json({
      status: 'success',
      data: { guard: guardObj, tempPassword },
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return next(new AppError('A security guard with this email already exists', 400));
    }
    next(err);
  }
};

/**
 * Lists Security Guards for the authenticated admin's store with
 * search, filtering, sorting and pagination
 */
export const getSecurityGuards = async (
  req: Request,
  res: Response<GuardsListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { search, shift, status, sort, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { storeId };

    if (shift) filter.shift = shift;
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { employeeId: regex }, { mobileNumber: regex }];
    }

    let sortBy: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'mostActive') sortBy = { todayVerifications: -1 };
    else if (sort === 'employeeId') sortBy = { employeeId: 1 };
    else if (sort === 'newest') sortBy = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const guards = await SecurityGuard.find(filter)
      .sort(sortBy)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      status: 'success',
      results: guards.length,
      data: { guards },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns dashboard summary stats for the authenticated admin's guards
 */
export const getSecurityGuardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);

    const [totalGuards, activeGuards, aggregate] = await Promise.all([
      SecurityGuard.countDocuments({ storeId }),
      SecurityGuard.countDocuments({ storeId, status: 'active' }),
      SecurityGuard.aggregate([
        { $match: { storeId } },
        {
          $group: {
            _id: null,
            todayVerifications: { $sum: '$todayVerifications' },
            reportedIssues: { $sum: '$reportedIssuesCount' },
          },
        },
      ]),
    ]);

    const guardsOnShift = await SecurityGuard.countDocuments({
      storeId,
      status: 'active',
      lastLogin: { $ne: null },
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalGuards,
        activeGuards,
        guardsOnShift,
        todayVerifications: aggregate[0]?.todayVerifications || 0,
        reportedIssues: aggregate[0]?.reportedIssues || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single Security Guard by ID, scoped to the admin's own store
 */
export const getSecurityGuard = async (
  req: Request<{ id: string }>,
  res: Response<SingleGuardResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const guard = await SecurityGuard.findOne({ _id: req.params.id, storeId });

    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    res.status(200).json({ status: 'success', data: { guard } });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates editable Security Guard fields (not password/employeeId)
 */
export const updateSecurityGuard = async (
  req: Request<{ id: string }>,
  res: Response<SingleGuardResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { firstName, lastName, mobileNumber, email, photo, shift, employeeCode, status } = req.body;

    const guard = await SecurityGuard.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { firstName, lastName, mobileNumber, email, photo, shift, employeeCode, status },
      { new: true, runValidators: true }
    );

    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    res.status(200).json({ status: 'success', data: { guard } });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggles a Security Guard's account status between active and inactive
 */
export const toggleSecurityGuardStatus = async (
  req: Request<{ id: string }>,
  res: Response<SingleGuardResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const guard = await SecurityGuard.findOne({ _id: req.params.id, storeId });

    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    guard.status = guard.status === 'active' ? 'inactive' : 'active';
    await guard.save();

    res.status(200).json({ status: 'success', data: { guard } });
  } catch (err) {
    next(err);
  }
};

/**
 * Resets a Security Guard's password to a new temporary one, returning
 * the plaintext value once so the admin can share it
 */
export const resetSecurityGuardPassword = async (
  req: Request<{ id: string }>,
  res: Response<{ status: string; data: { tempPassword: string } }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const guard = await SecurityGuard.findOne({ _id: req.params.id, storeId });

    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    const tempPassword = generateTempPassword();
    guard.password = await bcryptjs.hash(tempPassword, 10);
    await guard.save();

    res.status(200).json({ status: 'success', data: { tempPassword } });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently deletes a Security Guard account
 */
export const deleteSecurityGuard = async (
  req: Request<{ id: string }>,
  res: Response<{ status: string; data: null }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const guard = await SecurityGuard.findOneAndDelete({ _id: req.params.id, storeId });

    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    res.status(200).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends a Security Guard's credentials via email or SMS.
 * The plaintext temporary password must be supplied by the caller
 * (it is only ever known right after create/reset, never persisted).
 */
export const sendSecurityGuardCredentials = async (
  req: Request<{ id: string }>,
  res: Response<{ status: string; message: string }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { method, tempPassword } = req.body as { method: 'email' | 'sms'; tempPassword: string };

    if (!tempPassword) return next(new AppError('tempPassword is required', 400));
    if (method !== 'email' && method !== 'sms') {
      return next(new AppError("method must be 'email' or 'sms'", 400));
    }

    const guard = await SecurityGuard.findOne({ _id: req.params.id, storeId });
    if (!guard) return next(new AppError('No security guard found with that ID', 404));

    const store = await Store.findOne({ storeId }).select('name');
    const storeName = store?.name || storeId;

    if (method === 'email') {
      await sendGuardCredentialsEmail({
        to: guard.email,
        fullName: `${guard.firstName} ${guard.lastName}`,
        employeeId: guard.employeeId,
        mobileNumber: guard.mobileNumber,
        tempPassword,
        storeName,
        shift: guard.shift,
      });
    } else {
      await sendGuardCredentialsSms({
        to: guard.mobileNumber,
        employeeId: guard.employeeId,
        tempPassword,
        storeName,
      });
    }

    res.status(200).json({ status: 'success', message: `Credentials sent via ${method}` });
  } catch (err) {
    next(err);
  }
};
