/**
 * Credential Generator
 * Generates sequential employee IDs and secure temporary passwords for staff accounts
 */

import crypto from 'crypto';
import SecurityGuard from '../models/securityGuardModel.ts';
import Employee from '../models/employeeModel.ts';

/**
 * Generates the next sequential Security Guard employee ID (e.g. SG-0001)
 * scoped globally, based on the highest existing employeeId
 */
export const generateGuardEmployeeId = async (): Promise<string> => {
  const lastGuard = await SecurityGuard.findOne().sort({ createdAt: -1 }).select('employeeId');

  let nextNumber = 1;
  if (lastGuard?.employeeId) {
    const match = lastGuard.employeeId.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `SG-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Generates the next sequential Employee ID (e.g. EMP-0001)
 * scoped globally, based on the highest existing employeeId
 */
export const generateEmployeeId = async (): Promise<string> => {
  const lastEmployee = await Employee.findOne().sort({ createdAt: -1 }).select('employeeId');

  let nextNumber = 1;
  if (lastEmployee?.employeeId) {
    const match = lastEmployee.employeeId.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `EMP-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Generates a random, human-shareable temporary password
 * (mixed-case letters + digits, avoids ambiguous characters)
 */
export const generateTempPassword = (length = 10): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};
