import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import client from '../config/twilio.js';

const normalizeIndianPhoneNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;

  return null;
};

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const signRegistrationToken = (phoneNumber) => {
  return jwt.sign(
    {
      phoneNumber,
      purpose: 'phone_registration',
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'strict',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    success: true,
    token,
    user,
    data: { user },
  });
};

export const checkPhoneNumber = async (req, res, next) => {
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

export const sendOTP = async (req, res, next) => {
  try {
    const phoneNumber = normalizeIndianPhoneNumber(req.body.phone || req.body.phoneNumber);

    if (!phoneNumber) {
      return next(new AppError('Please provide a valid 10-digit phone number.', 400));
    }

    await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verifications.create({
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

export const verifyOTP = async (req, res, next) => {
  try {
    const phoneNumber = normalizeIndianPhoneNumber(req.body.phone || req.body.phoneNumber);
    const otp = String(req.body.otp || req.body.code || '').trim();

    if (!phoneNumber || !otp) {
      return next(new AppError('Phone number and OTP are required.', 400));
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
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
      return createSendToken(existingUser, 200, res);
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

export const completeRegistration = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const registrationToken = req.body.registrationToken;

    if (!registrationToken) {
      return next(new AppError('Registration token is required.', 400));
    }

    if (!name || name.length < 2) {
      return next(new AppError('Please provide your name.', 400));
    }

    const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);

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

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
    next(err);
  }
};
