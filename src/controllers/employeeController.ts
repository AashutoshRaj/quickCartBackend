/**
 * Employee Controller
 * Handles staff (Admin/Manager/Cashier/Inventory Staff) account CRUD and
 * credential generation/delivery, scoped to the authenticated admin's own store
 */

import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import Employee from '../models/employeeModel.ts';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';
import { getAuthenticatedStoreId } from '../utils/getAuthenticatedStore.ts';
import { generateEmployeeId, generateTempPassword } from '../utils/credentialGenerator.ts';
import { sendEmployeeCredentialsEmail } from '../utils/mailer.ts';
import { sendEmployeeCredentialsSms } from '../utils/smsSender.ts';
import type { IEmployee } from '../types/index';

interface SingleEmployeeResponse {
  status: string;
  data: { employee: Partial<IEmployee> };
}

interface EmployeesListResponse {
  status: string;
  results: number;
  data: { employees: Partial<IEmployee>[] };
}

/**
 * Creates a new Employee, scoped to the authenticated admin's store.
 * Generates a sequential employeeId and a temporary password, returning
 * the plaintext password once so the admin can share it with the employee.
 */
export const createEmployee = async (
  req: Request,
  res: Response<SingleEmployeeResponse & { data: { employee: Partial<IEmployee>; tempPassword: string } }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { firstName, lastName, role, email, phone, joiningDate, photo, status } = req.body;

    if (!firstName || !lastName || !role || !email || !phone) {
      return next(new AppError('firstName, lastName, role, email and phone are required', 400));
    }

    const employeeId = await generateEmployeeId();
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcryptjs.hash(tempPassword, 10);

    const employee = await Employee.create({
      employeeId,
      firstName,
      lastName,
      photo: photo || null,
      role,
      email,
      phone,
      password: hashedPassword,
      storeId,
      joiningDate: joiningDate || Date.now(),
      status: status || 'Active',
      createdBy: (req as any).user._id,
    });

    const employeeObj = employee.toObject();
    delete (employeeObj as any).password;

    res.status(201).json({
      status: 'success',
      data: { employee: employeeObj, tempPassword },
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return next(new AppError('An employee with this email already exists', 400));
    }
    next(err);
  }
};

/**
 * Lists Employees for the authenticated admin's store with search, filtering and sorting
 */
export const getEmployees = async (
  req: Request,
  res: Response<EmployeesListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { search, role, status, sort } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { storeId };
    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { employeeId: regex }, { email: regex }];
    }

    let sortBy: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'employeeId') sortBy = { employeeId: 1 };
    else if (sort === 'name') sortBy = { firstName: 1 };

    const employees = await Employee.find(filter).sort(sortBy);

    res.status(200).json({
      status: 'success',
      results: employees.length,
      data: { employees },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single Employee by ID, scoped to the admin's own store
 */
export const getEmployee = async (
  req: Request<{ id: string }>,
  res: Response<SingleEmployeeResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const employee = await Employee.findOne({ _id: req.params.id, storeId });

    if (!employee) return next(new AppError('No employee found with that ID', 404));

    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates editable Employee fields (not password/employeeId)
 */
export const updateEmployee = async (
  req: Request<{ id: string }>,
  res: Response<SingleEmployeeResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { firstName, lastName, role, email, phone, photo, status } = req.body;

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { firstName, lastName, role, email, phone, photo, status },
      { new: true, runValidators: true }
    );

    if (!employee) return next(new AppError('No employee found with that ID', 404));

    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

/**
 * Cycles an Employee's status between Active, On Leave and Inactive
 */
export const toggleEmployeeStatus = async (
  req: Request<{ id: string }>,
  res: Response<SingleEmployeeResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const { status } = req.body as { status?: 'Active' | 'On Leave' | 'Inactive' };
    const employee = await Employee.findOne({ _id: req.params.id, storeId });

    if (!employee) return next(new AppError('No employee found with that ID', 404));

    if (status) {
      employee.status = status;
    } else {
      employee.status = employee.status === 'Active' ? 'Inactive' : 'Active';
    }
    await employee.save();

    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

/**
 * Resets an Employee's password to a new temporary one, returning
 * the plaintext value once so the admin can share it
 */
export const resetEmployeePassword = async (
  req: Request<{ id: string }>,
  res: Response<{ status: string; data: { tempPassword: string } }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const employee = await Employee.findOne({ _id: req.params.id, storeId });

    if (!employee) return next(new AppError('No employee found with that ID', 404));

    const tempPassword = generateTempPassword();
    employee.password = await bcryptjs.hash(tempPassword, 10);
    await employee.save();

    res.status(200).json({ status: 'success', data: { tempPassword } });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently deletes an Employee account
 */
export const deleteEmployee = async (
  req: Request<{ id: string }>,
  res: Response<{ status: string; data: null }>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, storeId });

    if (!employee) return next(new AppError('No employee found with that ID', 404));

    res.status(200).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends an Employee's credentials via email or SMS.
 * The plaintext temporary password must be supplied by the caller
 * (it is only ever known right after create/reset, never persisted).
 */
export const sendEmployeeCredentials = async (
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

    const employee = await Employee.findOne({ _id: req.params.id, storeId });
    if (!employee) return next(new AppError('No employee found with that ID', 404));

    const store = await Store.findOne({ storeId }).select('name');
    const storeName = store?.name || storeId;

    if (method === 'email') {
      await sendEmployeeCredentialsEmail({
        to: employee.email,
        fullName: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        phone: employee.phone,
        tempPassword,
        storeName,
        role: employee.role,
      });
    } else {
      await sendEmployeeCredentialsSms({
        to: employee.phone,
        employeeId: employee.employeeId,
        tempPassword,
        storeName,
      });
    }

    res.status(200).json({ status: 'success', message: `Credentials sent via ${method}` });
  } catch (err) {
    next(err);
  }
};
