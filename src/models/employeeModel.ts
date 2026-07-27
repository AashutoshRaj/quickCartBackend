/**
 * Employee Model
 * Represents staff accounts (Admin/Manager/Cashier/Inventory Staff) assigned to a store
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IEmployee } from '../types/index';

const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee must have an employeeId'],
      unique: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'Employee must have a first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Employee must have a last name'],
      trim: true,
    },
    photo: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Cashier', 'Inventory Staff'],
      required: [true, 'Employee must have a role'],
    },
    email: {
      type: String,
      required: [true, 'Employee must have an email'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, 'Employee must have a phone number'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Employee must have a password'],
      select: false,
    },
    storeId: {
      type: String,
      required: [true, 'Employee must be assigned to a store'],
      index: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee must record who created it'],
    },
  },
  {
    timestamps: true,
  }
);

const Employee: Model<IEmployee> = mongoose.model<IEmployee>('Employee', employeeSchema);

export default Employee;
export type { IEmployee };
