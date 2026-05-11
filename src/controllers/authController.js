import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return next(new AppError('Please provide a phone number!', 400));
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    // Save OTP to user
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    // In a real app, send OTP via SMS (e.g., Twilio)
    // For now, we log it to console and return it for testing
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your phone!',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Return OTP in dev mode for easy testing
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return next(new AppError('Please provide phone number and OTP!', 400));
    }

    // 1) Find user with matching phone and non-expired OTP
    const user = await User.findOne({
      phoneNumber,
      otpExpires: { $gt: Date.now() },
    }).select('+otp +otpExpires');

    if (!user) {
      return next(new AppError('Invalid or expired OTP', 400));
    }

    // 2) Compare OTP value
    if (user.otp !== otp) {
      return next(new AppError('Invalid OTP', 400));
    }

    // 3) Clear OTP fields using $unset (more reliable than setting to undefined)
    await User.findByIdAndUpdate(user._id, {
      $unset: { otp: '', otpExpires: '' },
    });

    // 4) Send token
    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};


export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
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
    next(err);
  }
};

