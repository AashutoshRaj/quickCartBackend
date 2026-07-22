import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import globalErrorHandler from './middleware/errorMiddleware.ts';
import AppError from './utils/appError.ts';
import apiRouter from './routes/index.ts';

const app: Express = express();

// 1) GLOBAL MIDDLEWARES
// Implement CORS
const allowedOrigins = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Store-Id'],
  optionsSuccessStatus: 200,
}));

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

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to QuickCart API',
    version: '1.0.0',
  });
});

// 3) ERROR HANDLING
app.all('*path', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
