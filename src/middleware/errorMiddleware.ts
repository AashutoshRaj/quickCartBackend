import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 * Handles all application errors and sends appropriate responses
 * In development: includes full error details and stack trace
 * In production: only sends operational error messages to avoid leaking sensitive info
 *
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function (included for middleware signature)
 */
const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production: Don't leak error details
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!',
      });
    }
  }
};

export default globalErrorHandler;
