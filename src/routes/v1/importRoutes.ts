import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { protect } from '../../controllers/authController.ts';
import * as importController from '../../controllers/importController.ts';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.csv', '.xlsx', '.xls'];

  if (allowedExts.includes(ext)) {
    return cb(null, true);
  }

  cb(new Error(`Unsupported file type: ${ext}. Supported formats: CSV, XLSX, XLS`));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

/**
 * POST /api/v1/imports/upload
 * Upload and process bulk product import file
 * @param {File} file - CSV file with product data
 * @returns {object} Import result with success count and errors
 */
router.post('/upload', protect, upload.single('file'), importController.importProducts);

/**
 * GET /api/v1/imports
 * Get import history with pagination
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 10)
 * @returns {object} Import history with metadata
 */
router.get('/', protect, importController.getImportHistory);

export default router;
