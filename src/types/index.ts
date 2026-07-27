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
      staffActor?: StaffActor;
    }
  }
}

/**
 * Authenticated staff actor (Security Guard or Employee) attached by
 * protectStaff.ts middleware — separate from the customer/admin `user` above.
 */
export interface StaffActor {
  actorType: 'guard' | 'employee';
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  storeId: string;
  status: string;
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
  sku?: string;
  brand?: string;
  price: number;
  costPrice?: number;
  discountPrice?: number;
  description?: string;
  category: string;
  unit?: string;
  tax?: number;
  currency?: string;
  storeId: string;
  image?: string;
  stock?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  createdBy?: string;
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
export interface IBusinessHours {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

export interface IStore extends Document {
  storeId: string;
  ownerId?: string;
  name: string;
  email: string;
  logo?: string | null;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber: string;
  description?: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
  timezone: string;
  businessHours?: IBusinessHours[];
  status: 'active' | 'inactive' | 'closed';
  isActive: boolean;
  qrCode?: string | null;
  qrGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Security Guard Document Interface
 */
export interface ISecurityGuard extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  mobileNumber: string;
  email: string;
  password: string;
  storeId: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  joiningDate: Date;
  employeeCode?: string;
  status: 'active' | 'inactive';
  permissions: {
    login: boolean;
    scanExitQr: boolean;
    viewOrderDetails: boolean;
    verifyExit: boolean;
    viewVerificationHistory: boolean;
    reportIssues: boolean;
  };
  todayVerifications: number;
  weekVerifications: number;
  monthVerifications: number;
  totalOrdersVerified: number;
  reportedIssuesCount: number;
  lastLogin?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exit Verification Document Interface
 * Audit record of a guard approving a customer's exit for a given order
 */
export interface IExitVerification extends Document {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  guardId: string;
  guardName: string;
  customerName: string;
  totalAmount: number;
  itemsCount: number;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Employee Document Interface
 */
export interface IEmployee extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Inventory Staff';
  email: string;
  phone: string;
  password: string;
  storeId: string;
  joiningDate: Date;
  status: 'Active' | 'On Leave' | 'Inactive';
  lastLogin?: Date | null;
  createdBy: string;
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
  sku?: string;
  brand?: string;
  price: number;
  costPrice?: number;
  discountPrice?: number;
  description?: string;
  category: string;
  unit?: string;
  tax?: number;
  currency?: string;
  storeId?: string;
  image?: string;
  stock?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  createdBy?: string;
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
  storeId?: string;
  name: string;
  email: string;
  logo?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber: string;
  description?: string;
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
  timezone?: string;
  businessHours?: IBusinessHours[];
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
