/**
 * Security Guard Model
 * Represents exit-gate security guard accounts assigned to a store
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { ISecurityGuard } from '../types/index';

const securityGuardSchema = new Schema<ISecurityGuard>(
  {
    employeeId: {
      type: String,
      required: [true, 'Security guard must have an employeeId'],
      unique: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'Security guard must have a first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Security guard must have a last name'],
      trim: true,
    },
    photo: {
      type: String,
      default: null,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Security guard must have a mobile number'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Security guard must have an email'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Security guard must have a password'],
      select: false,
    },
    storeId: {
      type: String,
      required: [true, 'Security guard must be assigned to a store'],
      index: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Night'],
      required: [true, 'Security guard must have an assigned shift'],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    employeeCode: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    permissions: {
      login: { type: Boolean, default: true },
      scanExitQr: { type: Boolean, default: true },
      viewOrderDetails: { type: Boolean, default: true },
      verifyExit: { type: Boolean, default: true },
      viewVerificationHistory: { type: Boolean, default: true },
      reportIssues: { type: Boolean, default: true },
    },
    todayVerifications: {
      type: Number,
      default: 0,
    },
    weekVerifications: {
      type: Number,
      default: 0,
    },
    monthVerifications: {
      type: Number,
      default: 0,
    },
    totalOrdersVerified: {
      type: Number,
      default: 0,
    },
    reportedIssuesCount: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Security guard must record who created it'],
    },
  },
  {
    timestamps: true,
  }
);

const SecurityGuard: Model<ISecurityGuard> = mongoose.model<ISecurityGuard>(
  'SecurityGuard',
  securityGuardSchema
);

export default SecurityGuard;
export type { ISecurityGuard };
