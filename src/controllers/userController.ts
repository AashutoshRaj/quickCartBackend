/**
 * User Controller
 * Handles user profile, preferences, and settings operations
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/userModel.ts';
import AppError from '../utils/appError.ts';
import type { IUser } from '../types/index.ts';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Get authenticated user's profile
 */
export const getUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(req.user._id).select('-password');

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's preferred language
 */
export const updateLanguage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { language } = req.body;

    if (!language) {
      throw new AppError('Language is required', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'preferences.language': language },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's notification preferences
 */
export const updateNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { notificationSettings } = req.body;

    if (!notificationSettings) {
      throw new AppError('Notification settings are required', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'preferences.notifications': notificationSettings },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add new payment method to user account
 */
export const addPaymentMethod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { paymentData } = req.body;

    if (!paymentData) {
      throw new AppError('Payment data is required', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { paymentMethods: paymentData } },
      { new: true, runValidators: true }
    );

    res.status(201).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove payment method from user account
 */
export const deletePaymentMethod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { paymentMethodId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { paymentMethods: { _id: paymentMethodId } } },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set payment method as default for user
 */
export const setDefaultPaymentMethod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { paymentMethodId } = req.params;

    await User.updateMany(
      { _id: req.user._id },
      { $set: { 'paymentMethods.$[].isDefault': false } }
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'paymentMethods.$[elem].isDefault': true } },
      { arrayFilters: [{ 'elem._id': paymentMethodId }], new: true }
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user profile image
 */
export const uploadProfileImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const imageUrl = `/uploads/temp/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'profileImage.url': imageUrl, 'profileImage.uploadedAt': new Date() },
      { new: true }
    );

    res.status(201).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove user profile image
 */
export const deleteProfileImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: { url: null, uploadedAt: null } },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
