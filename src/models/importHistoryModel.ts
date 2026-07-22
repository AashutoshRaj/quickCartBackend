/**
 * Import History Model
 * Tracks bulk product import operations
 */

import mongoose, { Model, Schema } from 'mongoose';

export interface IImportHistory extends Document {
  storeId: string;
  fileName: string;
  uploadedBy: string;
  totalRecords: number;
  successfulImports: number;
  failedRecords: number;
  duplicateRecords: number;
  importStatus: 'processing' | 'completed' | 'failed';
  processingTimeMs: number;
  errors?: Array<{
    row: number;
    field: string;
    value: unknown;
    error: string;
  }>;
  skipped?: Array<{
    row: number;
    reason: string;
    data: unknown;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const importHistorySchema = new Schema<IImportHistory>(
  {
    storeId: {
      type: String,
      required: [true, 'Import must belong to a store'],
      trim: true,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    uploadedBy: {
      type: String,
      required: [true, 'Uploaded by is required'],
      trim: true,
    },
    totalRecords: {
      type: Number,
      required: true,
      default: 0,
    },
    successfulImports: {
      type: Number,
      required: true,
      default: 0,
    },
    failedRecords: {
      type: Number,
      required: true,
      default: 0,
    },
    duplicateRecords: {
      type: Number,
      required: true,
      default: 0,
    },
    importStatus: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
    errors: [
      {
        row: Number,
        field: String,
        value: Schema.Types.Mixed,
        error: String,
      },
    ],
    skipped: [
      {
        row: Number,
        reason: String,
        data: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

importHistorySchema.index({ storeId: 1, createdAt: -1 });
importHistorySchema.index({ storeId: 1, importStatus: 1 });

const ImportHistory: Model<IImportHistory> = mongoose.model<IImportHistory>(
  'ImportHistory',
  importHistorySchema
);

export default ImportHistory;
