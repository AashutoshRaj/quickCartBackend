/**
 * Authentication Controller
 * Handles phone-based authentication with OTP verification
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.ts';
import AppError from '../utils/appError.ts';
import client from '../config/twilio.ts';
import type {
  IUser,
  CheckPhoneRequest,
  SendOTPRequest,
  VerifyOTPRequest,
  CompleteRegistrationRequest,
  CheckPhoneResponse,
  SendOTPResponse,
  VerifyOTPResponse,
  TokenResponse,
} from '../types/index';

/**
 * Normalizes Indian phone numbers to E.164 format
 * @param phone - Phone number input (10 digits or 12 with country code)
 * @returns Normalized phone number in E.164 format or null
 */
const normalizeIndianPhoneNumber = (phone: unknown): string | null => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;

  return null;
};

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
 * Signs a temporary JWT token for phone registration
 * @param phoneNumber - User's phone number
 * @returns Temporary registration token
 */
const signRegistrationToken = (phoneNumber: string): string => {
  return jwt.sign(
    {
      phoneNumber,
      purpose: 'phone_registration',
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '10m' }
  );
};

/**
 * Creates and sends authentication token to client
 * @param user - User document
 * @param statusCode - HTTP status code
 * @param res - Express response object
 */
const createSendToken = (user: IUser, statusCode: number, res: Response<TokenResponse>): void => {
  const token = signToken(user._id.toString());
  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'strict' as const,
  };
  if (process.env.NODE_ENV === 'production') {
    (cookieOptions as Record<string, unknown>).secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    success: true,
    token,
    user,
    data: { user },
  });
};

/**
 * Checks if a phone number is already registered
 * @param req - Express request with phone in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if phone number is invalid
 */
export const checkPhoneNumber = async (
  req: Request<never, CheckPhoneResponse, CheckPhoneRequest>,
  res: Response<CheckPhoneResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const phoneNumber = normalizeIndianPhoneNumber(req.body.phone || req.body.phoneNumber);

    if (!phoneNumber) {
      return next(new AppError('Please provide a valid 10-digit phone number.', 400));
    }

    const user = await User.findOne({ phoneNumber }).select('_id');

    res.status(200).json({
      status: 'success',
      success: true,
      isRegistered: !!user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends OTP to the provided phone number via SMS
 * @param req - Express request with phone in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if phone number is invalid
 */
export const sendOTP = async (
  req: Request<never, SendOTPResponse, SendOTPRequest>,
  res: Response<SendOTPResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const phoneNumber = normalizeIndianPhoneNumber(req.body.phone || req.body.phoneNumber);

    if (!phoneNumber) {
      return next(new AppError('Please provide a valid 10-digit phone number.', 400));
    }

    await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID as string).verifications.create({
      to: phoneNumber,
      channel: 'sms',
    });

    const user = await User.findOne({ phoneNumber }).select('_id');

    res.status(200).json({
      status: 'success',
      success: true,
      isRegistered: !!user,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies OTP and authenticates user or initiates registration
 * @param req - Express request with phone and OTP in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if OTP is invalid or phone number is invalid
 */
export const verifyOTP = async (
  req: Request<never, VerifyOTPResponse | TokenResponse, VerifyOTPRequest>,
  res: Response<VerifyOTPResponse | TokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const phoneNumber = normalizeIndianPhoneNumber(req.body.phone || req.body.phoneNumber);
    const otp = String(req.body.otp || req.body.code || '').trim();

    if (!phoneNumber || !otp) {
      return next(new AppError('Phone number and OTP are required.', 400));
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });

    if (verificationCheck.status !== 'approved') {
      return next(new AppError('Invalid or expired OTP.', 400));
    }

    const existingUser = await User.findOneAndUpdate(
      { phoneNumber },
      {
        $set: {
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (existingUser) {
      return createSendToken(existingUser, 200, res as Response<TokenResponse>);
    }

    res.status(200).json({
      status: 'success',
      success: true,
      requiresRegistration: true,
      registrationToken: signRegistrationToken(phoneNumber),
      message: 'Phone number verified. Please complete registration.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Completes user registration with name after OTP verification
 * @param req - Express request with name and registration token
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if registration token is invalid or name is missing
 */
export const completeRegistration = async (
  req: Request<never, TokenResponse, CompleteRegistrationRequest>,
  res: Response<TokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const name = String(req.body.name || '').trim();
    const registrationToken = req.body.registrationToken;

    if (!registrationToken) {
      return next(new AppError('Registration token is required.', 400));
    }

    if (!name || name.length < 2) {
      return next(new AppError('Please provide your name.', 400));
    }

    interface DecodedToken {
      phoneNumber?: string;
      purpose?: string;
      iat?: number;
      exp?: number;
    }

    const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET as string) as DecodedToken;

    if (decoded.purpose !== 'phone_registration' || !decoded.phoneNumber) {
      return next(new AppError('Invalid registration token.', 400));
    }

    const user = await User.findOneAndUpdate(
      { phoneNumber: decoded.phoneNumber },
      {
        $setOnInsert: {
          phoneNumber: decoded.phoneNumber,
          name,
          role: 'user',
          isPhoneVerified: true,
        },
        $set: {
          lastLoginAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    createSendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to protect routes requiring authentication
 * Extracts and verifies JWT token from Authorization header or cookies
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if user is not authenticated or token is invalid
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    interface DecodedToken {
      id?: string;
      iat?: number;
      exp?: number;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
    next(err);
  }
};
