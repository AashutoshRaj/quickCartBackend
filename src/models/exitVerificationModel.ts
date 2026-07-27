/**
 * Exit Verification Model
 * Audit log of Security Guard exit approvals. The unique index on `sessionId`
 * is the hard backstop against the same order being approved twice, even
 * under concurrent requests.
 */

import mongoose, { Model, Schema } from 'mongoose';
import type { IExitVerification } from '../types/index';

const exitVerificationSchema = new Schema<IExitVerification>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    storeId: {
      type: String,
      required: true,
      index: true,
    },
    guardId: {
      type: Schema.Types.ObjectId,
      ref: 'SecurityGuard',
      required: true,
      index: true,
    },
    guardName: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: 'Customer',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    itemsCount: {
      type: Number,
      default: 0,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ExitVerification: Model<IExitVerification> = mongoose.model<IExitVerification>(
  'ExitVerification',
  exitVerificationSchema
);

export default ExitVerification;
export type { IExitVerification };
