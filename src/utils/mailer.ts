/**
 * Mailer
 * Sends transactional emails (e.g. Security Guard credentials) via SMTP.
 * Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in the environment.
 */

import nodemailer, { Transporter } from 'nodemailer';
import AppError from './appError.ts';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new AppError(
      'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.',
      500
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

interface GuardCredentialsEmailInput {
  to: string;
  fullName: string;
  employeeId: string;
  mobileNumber: string;
  tempPassword: string;
  storeName: string;
  shift: string;
}

/**
 * Emails newly generated Security Guard login credentials to the guard
 */
export const sendGuardCredentialsEmail = async (input: GuardCredentialsEmailInput): Promise<void> => {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to: input.to,
    subject: 'Your QuickCart Security Guard Account Credentials',
    text: [
      `Hi ${input.fullName},`,
      '',
      'Your Security Guard account has been created.',
      '',
      `Employee ID: ${input.employeeId}`,
      `Phone Number: ${input.mobileNumber}`,
      `Temporary Password: ${input.tempPassword}`,
      `Assigned Store: ${input.storeName}`,
      `Assigned Shift: ${input.shift}`,
      '',
      'Please log in and change your password on first use.',
    ].join('\n'),
  });
};

interface EmployeeCredentialsEmailInput {
  to: string;
  fullName: string;
  employeeId: string;
  phone: string;
  tempPassword: string;
  storeName: string;
  role: string;
}

/**
 * Emails newly generated Employee login credentials to the employee
 */
export const sendEmployeeCredentialsEmail = async (input: EmployeeCredentialsEmailInput): Promise<void> => {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to: input.to,
    subject: 'Your QuickCart Staff Account Credentials',
    text: [
      `Hi ${input.fullName},`,
      '',
      'Your staff account has been created.',
      '',
      `Employee ID: ${input.employeeId}`,
      `Phone Number: ${input.phone}`,
      `Temporary Password: ${input.tempPassword}`,
      `Store: ${input.storeName}`,
      `Role: ${input.role}`,
      '',
      'Please log in and change your password on first use.',
    ].join('\n'),
  });
};
