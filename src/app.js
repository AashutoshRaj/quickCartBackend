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
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.11:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Store-Id'],
  optionsSuccessStatus: 204,
};

// 1) GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors(corsOptions));

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://control.msg91.com"],
        frameSrc: ["'self'", "https://control.msg91.com", "https://*.hcaptcha.com"],
        connectSrc: ["'self'", "https://control.msg91.com"],
        imgSrc: ["'self'", "data:", "https://control.msg91.com", "https://*.hcaptcha.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

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

// Serve static files
app.use(express.static('public'));

// Data sanitization against XSS
// app.use(xss()); // If you have xss-clean installed

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
