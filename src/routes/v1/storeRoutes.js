import express from 'express';
import {
  scanStore,
  getAllStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
} from '../../controllers/storeController.js';

const router = express.Router();

// Public routes
router.get('/scan/:storeId', scanStore); // Scan store by QR code or manual ID
router.get('/', getAllStores); // Get all active stores
router.get('/:id', getStore); // Get store by MongoDB ID

// Protected routes (admin only)
router.post('/', createStore); // Create new store
router.patch('/:id', updateStore); // Update store
router.delete('/:id', deleteStore); // Delete store

export default router;
