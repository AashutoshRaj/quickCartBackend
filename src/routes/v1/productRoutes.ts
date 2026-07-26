import { Router } from 'express';
import * as productController from '../../controllers/productController.ts';
import { protect } from '../../controllers/authController.ts';

const router = Router();

/**
 * GET /products/barcode/:barcode
 * Get product by barcode (must be before /:id to avoid conflict)
 * @param {string} barcode - Product barcode to lookup
 * @returns {object} Product details (200)
 */
router.get('/barcode/:barcode', productController.getProductByBarcode);

/**
 * GET /products
 * Get all products with pagination and filtering
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 10)
 * @query {string} search - Search query
 * @returns {Array} List of products (200)
 */
/**
 * POST /products
 * Create new product (requires authentication)
 * @param {object} productData - Product information
 * @returns {object} Created product (201)
 */
router
  .route('/')
  .get(protect, productController.getAllProducts)
  .post(protect, productController.createProduct);

/**
 * GET /products/:id
 * Get product by ID
 * @param {string} id - Product ID
 * @returns {object} Product details (200)
 */
/**
 * PATCH /products/:id
 * Update product (requires authentication)
 * @param {string} id - Product ID
 * @param {object} updateData - Fields to update
 * @returns {object} Updated product (200)
 */
/**
 * DELETE /products/:id
 * Delete product (requires authentication)
 * @param {string} id - Product ID
 * @returns {object} Deletion confirmation (200)
 */
router
  .route('/:id')
  .get(protect, productController.getProduct)
  .patch(protect, productController.updateProduct)
  .delete(protect, productController.deleteProduct);

export default router;
