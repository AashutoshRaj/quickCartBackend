import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import globalErrorHandler from './middleware/errorMiddleware.js';
import AppError from './utils/appError.js';
import apiRouter from './routes/index.js';

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against XSS and CORS
app.use(cors());

// 2) ROUTES
app.use('/api/v1', apiRouter);

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to QuickCart API',
    version: '1.0.0',
  });
});

// 3) ERROR HANDLING
app.all('*path', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
