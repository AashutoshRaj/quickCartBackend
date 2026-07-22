/**
 * Import Controller
 * Handles CSV/Excel product imports with validation and duplicate detection
 */

import { Request, Response, NextFunction } from 'express';
import Product from '../models/productModel.ts';
import ImportHistory from '../models/importHistoryModel.ts';
import AppError from '../utils/appError.ts';
import type { IProduct, CreateProductRequest } from '../types/index';
import * as fs from 'fs';
import * as readline from 'readline';
import XLSX from 'xlsx';

interface ImportedRow {
  name?: string;
  barcode?: string;
  sku?: string;
  brand?: string;
  price?: string | number;
  costPrice?: string | number;
  discountPrice?: string | number;
  description?: string;
  category?: string;
  unit?: string;
  tax?: string | number;
  currency?: string;
  image?: string;
  stock?: string | number;
  status?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
}

interface ImportResult {
  total: number;
  success: number;
  duplicates: number;
  failed: number;
  errors: ValidationError[];
  skipped: Array<{
    row: number;
    reason: string;
    data: ImportedRow;
  }>;
}

/**
 * Validate product row
 */
const validateProductRow = (
  row: ImportedRow,
  rowIndex: number,
  errors: ValidationError[]
): boolean => {
  const name = row.name?.trim();
  const category = row.category?.trim();
  const price = parseFloat(row.price as string);

  if (rowIndex === 2) {
    console.log(`[IMPORT] Validating row 2. Row data:`, row);
    console.log(`[IMPORT] Extracted name: "${name}", category: "${category}", price: ${price}`);
  }

  if (!name || name.length === 0) {
    errors.push({ row: rowIndex, field: 'name', value: row.name, error: 'Name is required' });
    return false;
  }

  if (!category || category.length === 0) {
    errors.push({ row: rowIndex, field: 'category', value: row.category, error: 'Category is required' });
    return false;
  }

  if (!row.price || isNaN(price) || price < 0) {
    errors.push({ row: rowIndex, field: 'price', value: row.price, error: 'Valid price is required' });
    return false;
  }

  return true;
};

/**
 * Check for duplicate product
 */
const checkDuplicate = async (
  row: ImportedRow,
  storeId: string
): Promise<boolean> => {
  if (row.barcode?.trim()) {
    const duplicate = await Product.findOne({
      storeId,
      barcode: row.barcode.trim(),
    });
    if (duplicate) return true;
  }

  if (row.sku?.trim()) {
    const duplicate = await Product.findOne({
      storeId,
      sku: row.sku.trim(),
    });
    if (duplicate) return true;
  }

  return false;
};

/**
 * Parse CSV file and return rows
 */
const parseCSVFile = (filePath: string): Promise<ImportedRow[]> => {
  return new Promise((resolve, reject) => {
    const results: ImportedRow[] = [];
    let headers: string[] = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;

      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

      if (lineNumber === 1) {
        headers = values;
        return;
      }

      if (values.some((val) => val !== '')) {
        const row: ImportedRow = {};
        headers.forEach((header, idx) => {
          if (values[idx]) {
            row[header as keyof ImportedRow] = values[idx];
          }
        });
        results.push(row);
      }
    });

    rl.on('close', () => resolve(results));
    rl.on('error', reject);
  });
};

/**
 * Parse Excel file and return rows
 */
const parseExcelFile = (filePath: string): Promise<ImportedRow[]> => {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const jsonData = XLSX.utils.sheet_to_json<ImportedRow>(worksheet);
    return Promise.resolve(jsonData);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Detect file type and parse accordingly
 */
const parseFile = (filePath: string, originalFileName: string): Promise<ImportedRow[]> => {
  const ext = originalFileName.toLowerCase().split('.').pop();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelFile(filePath);
  }

  if (ext === 'csv') {
    return parseCSVFile(filePath);
  }

  return Promise.reject(new Error(`Unsupported file type: ${ext}`));
};

/**
 * Import products from CSV
 * POST /api/v1/imports/upload
 */
export const importProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const storeId = req.user?.storeName || 'default-store';
    const createdBy = req.user?.name || 'unknown';
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    const rows = await parseFile(filePath, fileName);

    console.log(`[IMPORT] File parsed. Total rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`[IMPORT] First row keys:`, Object.keys(rows[0]));
      console.log(`[IMPORT] First row data:`, rows[0]);
    }

    const result: ImportResult = {
      total: rows.length,
      success: 0,
      duplicates: 0,
      failed: 0,
      errors: [],
      skipped: [],
    };

    const productsToInsert: Partial<IProduct>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      if (!validateProductRow(row, rowIndex, result.errors)) {
        result.failed++;
        continue;
      }

      const isDuplicate = await checkDuplicate(row, storeId);
      if (isDuplicate) {
        result.duplicates++;
        result.skipped.push({
          row: rowIndex,
          reason: 'Duplicate barcode or SKU',
          data: row,
        });
        continue;
      }

      productsToInsert.push({
        name: row.name?.trim(),
        barcode: row.barcode?.trim(),
        sku: row.sku?.trim(),
        brand: row.brand?.trim(),
        price: parseFloat(row.price as string),
        costPrice: row.costPrice ? parseFloat(row.costPrice as string) : 0,
        discountPrice: row.discountPrice ? parseFloat(row.discountPrice as string) : 0,
        description: row.description?.trim(),
        category: row.category?.trim(),
        unit: row.unit?.trim() || 'piece',
        tax: row.tax ? parseFloat(row.tax as string) : 0,
        currency: row.currency?.toUpperCase() || 'USD',
        image: row.image?.trim() || '',
        stock: row.stock ? parseInt(row.stock as string) : 0,
        status: (row.status as any) || 'active',
        storeId,
        createdBy,
      });
    }

    if (productsToInsert.length > 0) {
      await Product.insertMany(productsToInsert);
      result.success = productsToInsert.length;
    }

    const processingTimeMs = Date.now() - startTime;

    const importHistoryData: any = {
      storeId,
      fileName,
      uploadedBy: createdBy,
      totalRecords: result.total,
      successfulImports: result.success,
      failedRecords: result.failed,
      duplicateRecords: result.duplicates,
      importStatus: 'completed',
      processingTimeMs,
    };

    if (result.errors && result.errors.length > 0) {
      importHistoryData.errors = result.errors;
    }

    if (result.skipped && result.skipped.length > 0) {
      importHistoryData.skipped = result.skipped;
    }

    await ImportHistory.create(importHistoryData);

    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting file:', e);
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        processingTimeMs,
      },
      message: `Imported ${result.success} products. ${result.duplicates} duplicates skipped. ${result.failed} records failed.`,
    });
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;
    const storeId = req.user?.storeName || 'default-store';
    const createdBy = req.user?.name || 'unknown';
    const fileName = req.file?.originalname || 'unknown-file';

    try {
      await ImportHistory.create({
        storeId,
        fileName,
        uploadedBy: createdBy,
        totalRecords: 0,
        successfulImports: 0,
        failedRecords: 0,
        duplicateRecords: 0,
        importStatus: 'failed',
        processingTimeMs,
        errors: [
          {
            row: 0,
            field: 'file',
            value: fileName,
            error: err instanceof Error ? err.message : String(err),
          },
        ],
      });
    } catch (historyErr) {
      console.error('Error creating import history record:', historyErr);
    }

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }
    next(err);
  }
};

/**
 * Get import history with pagination
 * GET /api/v1/imports
 */
export const getImportHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const storeId = req.user?.storeName || 'default-store';

    const total = await ImportHistory.countDocuments({ storeId });
    const history = await ImportHistory.find({ storeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      status: 'success',
      data: history,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get import record by ID
 * GET /api/v1/imports/:id
 */
export const getImportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeName || 'default-store';

    const record = await ImportHistory.findOne({
      _id: id,
      storeId,
    }).lean();

    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Import record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: record,
    });
  } catch (err) {
    next(err);
  }
};
