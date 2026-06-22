import express from 'express';
import * as productController from '../../controllers/productController.js';
import { protect } from '../../controllers/authController.js';

const router = express.Router();

// Barcode lookup route (must be before /:id to avoid conflict)
router.get('/barcode/:barcode', productController.getProductByBarcode);

router
  .route('/')
  .get(productController.getAllProducts)
  .post(protect, productController.createProduct);

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(protect, productController.updateProduct)
  .delete(protect, productController.deleteProduct);

export default router;
