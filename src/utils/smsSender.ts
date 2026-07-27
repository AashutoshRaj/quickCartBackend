/**
 * SMS Sender
 * Sends transactional SMS (e.g. Security Guard credentials) via Twilio.
 * Requires TWILIO_PHONE_NUMBER in the environment (in addition to the
 * TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN already required by config/twilio.ts).
 */

import twilioClient from '../config/twilio.ts';
import AppError from './appError.ts';

interface GuardCredentialsSmsInput {
  to: string;
  employeeId: string;
  tempPassword: string;
  storeName: string;
}

/**
 * Texts newly generated Security Guard login credentials to the guard's mobile number
 */
export const sendGuardCredentialsSms = async (input: GuardCredentialsSmsInput): Promise<void> => {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new AppError('SMS service is not configured. Set TWILIO_PHONE_NUMBER.', 500);
  }

  await twilioClient.messages.create({
    from,
    to: input.to,
    body: `QuickCart Security Guard account created. Employee ID: ${input.employeeId}, Temporary Password: ${input.tempPassword}, Store: ${input.storeName}. Please log in and change your password.`,
  });
};

interface EmployeeCredentialsSmsInput {
  to: string;
  employeeId: string;
  tempPassword: string;
  storeName: string;
}

/**
 * Texts newly generated Employee login credentials to the employee's phone number
 */
export const sendEmployeeCredentialsSms = async (input: EmployeeCredentialsSmsInput): Promise<void> => {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new AppError('SMS service is not configured. Set TWILIO_PHONE_NUMBER.', 500);
  }

  await twilioClient.messages.create({
    from,
    to: input.to,
    body: `QuickCart staff account created. Employee ID: ${input.employeeId}, Temporary Password: ${input.tempPassword}, Store: ${input.storeName}. Please log in and change your password.`,
  });
};
