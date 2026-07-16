import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-active');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;

    if (!language) {
      return next(new AppError('Language is required', 400));
    }

    const validLanguages = ['English (US)', 'Hindi', 'Spanish', 'French'];
    if (!validLanguages.includes(language)) {
      return next(new AppError('Invalid language selected', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'preferences.language': language },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotifications = async (req, res, next) => {
  try {
    const { notificationsEnabled, emailNotifications, smsNotifications } = req.body;

    const updateData = {};
    if (notificationsEnabled !== undefined) updateData['preferences.notificationsEnabled'] = notificationsEnabled;
    if (emailNotifications !== undefined) updateData['preferences.emailNotifications'] = emailNotifications;
    if (smsNotifications !== undefined) updateData['preferences.smsNotifications'] = smsNotifications;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const addPaymentMethod = async (req, res, next) => {
  try {
    const { cardLast4, expiryDate, cardholderName, isDefault } = req.body;

    if (!cardLast4 || !expiryDate || !cardholderName) {
      return next(new AppError('Card last 4 digits, expiry date, and cardholder name are required', 400));
    }

    if (!/^\d{4}$/.test(cardLast4)) {
      return next(new AppError('Card last 4 must be exactly 4 digits', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          savedPaymentMethods: {
            cardNumber: `****-****-****-${cardLast4}`,
            cardLast4,
            expiryDate,
            cardholderName,
            isDefault: isDefault || false,
          },
        },
      },
      { new: true, runValidators: true }
    );

    res.status(201).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const deletePaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          savedPaymentMethods: { _id: paymentMethodId },
        },
      },
      { new: true }
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.savedPaymentMethods.forEach(method => {
      method.isDefault = method._id.toString() === paymentMethodId;
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return next(new AppError('Only JPEG, PNG, and WebP images are allowed', 400));
    }

    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return next(new AppError('File size must be less than 5MB', 400));
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      fs.unlinkSync(req.file.path);
      return next(new AppError('User not found', 404));
    }

    if (user.profileImage?.url) {
      const oldImagePath = path.join(process.cwd(), 'public', user.profileImage.url.replace(/^\//, ''));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const imageUrl = `/uploads/profile-images/${req.user._id}-${Date.now()}${path.extname(req.file.originalname)}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile-images');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const newPath = path.join(uploadDir, path.basename(imageUrl));
    fs.renameSync(req.file.path, newPath);

    user.profileImage = {
      url: imageUrl,
      uploadedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      status: 'success',
      data: { user },
      message: 'Profile image uploaded successfully',
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

export const deleteProfileImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.profileImage?.url) {
      const imagePath = path.join(process.cwd(), 'public', user.profileImage.url.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      user.profileImage = {
        url: null,
        uploadedAt: null,
      };

      await user.save();
    }

    res.status(200).json({
      status: 'success',
      data: { user },
      message: 'Profile image deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
