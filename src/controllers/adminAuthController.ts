/**
 * Admin Authentication Controller
 * Handles admin signup, login, and authentication operations
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import User from '../models/userModel.ts';
import AppError from '../utils/appError.ts';
import type {
  IUser,
  AdminSignupRequest,
  AdminLoginRequest,
  TokenResponse,
} from '../types/index';

/**
 * Signs a JWT token for user authentication
 * @param id - User ID
 * @returns Signed JWT token
 */
const signToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

/**
 * Response body for admin endpoints
 */
interface AdminTokenResponse {
  status: string;
  success: boolean;
  token: string;
  data: {
    user: {
      id: string;
      name: string;
      email?: string;
      storeName?: string;
      phone?: string;
      createdAt: Date;
    };
  };
  message?: string;
}

/**
 * Creates and sends authentication token to admin client
 * @param user - Admin user document
 * @param statusCode - HTTP status code
 * @param res - Express response object
 */
const createSendToken = (user: IUser, statusCode: number, res: Response<AdminTokenResponse>): void => {
  const token = signToken(user._id.toString());

  res.status(statusCode).json({
    status: 'success',
    success: true,
    token,
    data: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phoneNumber,
        createdAt: user.createdAt,
      },
    },
  });
};

/**
 * Creates a new admin user account
 * Validates input and checks for existing admin with same email
 * @param req - Express request with admin signup details
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if validation fails or admin already exists
 */
export const adminSignup = async (
  req: Request<never, AdminTokenResponse, AdminSignupRequest>,
  res: Response<AdminTokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, storeName, password, phone } = req.body;

    // Validation
    if (!name || !email || !storeName || !password) {
      return next(new AppError('Please provide name, email, storeName, and password', 400));
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email, role: 'admin' });
    if (existingAdmin) {
      return next(new AppError('Admin with this email already exists', 409));
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create admin user
    const admin = await User.create({
      name,
      email,
      storeName,
      password: hashedPassword,
      phoneNumber: phone || null,
      role: 'admin',
      isPhoneVerified: true,
    });

    createSendToken(admin, 201, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Authenticates admin user with email and password
 * Verifies password hash and returns authentication token
 * @param req - Express request with email and password
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if email or password is invalid
 */
export const adminLogin = async (
  req: Request<never, AdminTokenResponse, AdminLoginRequest>,
  res: Response<AdminTokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find admin by email and verify role
    const admin = await User.findOne({ email, role: 'admin' }).select('+password');

    if (!admin) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, admin.password || '');
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    createSendToken(admin, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves current authenticated admin user information
 * Requires user to be authenticated and have admin role
 * @param req - Express request with authenticated user
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if user is not admin or not found
 */
export const getAdminMe = async (
  req: Request,
  res: Response<AdminTokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const admin = await User.findById(req.user?._id);

    if (!admin || admin.role !== 'admin') {
      return next(new AppError('Unauthorized access', 403));
    }

    res.status(200).json({
      status: 'success',
      success: true,
      data: {
        user: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          storeName: admin.storeName,
          phone: admin.phoneNumber,
          createdAt: admin.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logs out the current admin user by clearing JWT cookie
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const adminLogout = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.cookie('jwt', '', { expires: new Date(0) });
  res.status(200).json({
    status: 'success',
    success: true,
    message: 'Logged out successfully',
  });
};
