/**
 * Backend TypeScript Types and Interfaces
 * Mongoose model document types and related types
 */

import { Document, Schema } from 'mongoose';

/**
 * Express Request Extension
 * Adds user property to Express Request object
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

/**
 * User Document Interface
 */
export interface IPaymentMethod {
  _id?: Schema.Types.ObjectId;
  cardNumber: string;
  cardLast4: string;
  expiryDate: string;
  cardholderName: string;
  isDefault: boolean;
  createdAt?: Date;
}

export interface ILoyaltyBalance {
  points: number;
  validUntil: Date;
}

export interface IProfileImage {
  url: string | null;
  uploadedAt: Date | null;
}

export interface IUserPreferences {
  language: 'English (US)' | 'Hindi' | 'Spanish' | 'French';
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface IUser extends Document {
  name: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  storeName?: string;
  role: 'user' | 'admin';
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  active: boolean;
  loyaltyBalance: ILoyaltyBalance;
  savedPaymentMethods: IPaymentMethod[];
  profileImage: IProfileImage;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Document Interface
 */
export interface IProduct extends Document {
  name: string;
  barcode?: string;
  price: number;
  description: string;
  category: string;
  storeId: string;
  image: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cart Document Interfaces
 */
export interface ICartItem {
  productId: Schema.Types.ObjectId;
  barcode?: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ICart extends Document {
  customerId: Schema.Types.ObjectId;
  storeId: string;
  items: ICartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: 'active' | 'checked_out';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order Document Interfaces
 */
export interface IOrderItem {
  productId: string;
  name?: string;
  productName?: string;
  price: number;
  unitPrice?: number;
  quantity: number;
  subtotal: number;
}

export interface IOrder extends Document {
  sessionId?: string;
  customerId: Schema.Types.ObjectId;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storeLogo?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalAmount?: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'exited';
  paymentMethod: 'card' | 'upi' | 'wallet' | 'cash';
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  invoiceUrl?: string;
  notes?: string;
  exitedAt?: Date;
  paidAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store Document Interface
 */
export interface IStore extends Document {
  storeId: string;
  name: string;
  email: string;
  logo?: string | null;
  address: string;
  phoneNumber: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
  timezone: string;
  status: 'active' | 'inactive' | 'closed';
  isActive: boolean;
  qrCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query Response Types
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Request Types
 */
export interface CreateUserRequest {
  name?: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  storeName?: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  storeName?: string;
  preferences?: Partial<IUserPreferences>;
}

export interface CreateProductRequest {
  name: string;
  barcode?: string;
  price: number;
  description: string;
  category: string;
  storeId?: string;
  image?: string;
  stock?: number;
}

export interface CreateOrderRequest {
  customerId: string;
  storeId: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  paymentMethod?: 'card' | 'upi' | 'wallet' | 'cash';
}

export interface CreateStoreRequest {
  storeId: string;
  name: string;
  email: string;
  logo?: string;
  address: string;
  phoneNumber: string;
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
  timezone?: string;
}

/**
 * Auth Controller Types
 */
export interface CheckPhoneRequest {
  phone?: string;
  phoneNumber?: string;
}

export interface SendOTPRequest {
  phone?: string;
  phoneNumber?: string;
}

export interface VerifyOTPRequest {
  phone?: string;
  phoneNumber?: string;
  otp?: string;
  code?: string;
}

export interface CompleteRegistrationRequest {
  name: string;
  registrationToken: string;
}

export interface AdminSignupRequest {
  name: string;
  email: string;
  storeName: string;
  password: string;
  phone?: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

/**
 * Auth Response Types
 */
export interface TokenResponse {
  status: string;
  success: boolean;
  token: string;
  user: Partial<IUser>;
  data: { user: Partial<IUser> };
}

export interface CheckPhoneResponse {
  status: string;
  success: boolean;
  isRegistered: boolean;
}

export interface SendOTPResponse {
  status: string;
  success: boolean;
  isRegistered: boolean;
  message: string;
}

export interface VerifyOTPResponse {
  status: string;
  success: boolean;
  requiresRegistration?: boolean;
  registrationToken?: string;
  message?: string;
}
