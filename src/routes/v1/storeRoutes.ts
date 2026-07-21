import { Router } from 'express';
import {
  scanStore,
  getAllStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
} from '../../controllers/storeController.ts';

const router = Router();

/**
 * GET /stores/scan/:storeId
 * Scan store by QR code or manual ID (public route)
 * @param {string} storeId - Store ID or QR code identifier
 * @returns {object} Store details (200)
 */
router.get('/scan/:storeId', scanStore);

/**
 * GET /stores
 * Get all active stores (public route)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 10)
 * @returns {Array} List of active stores (200)
 */
router.get('/', getAllStores);

/**
 * GET /stores/:id
 * Get store details by MongoDB ID (public route)
 * @param {string} id - Store MongoDB ID
 * @returns {object} Store details (200)
 */
router.get('/:id', getStore);

/**
 * POST /stores
 * Create new store (admin only)
 * @param {object} storeData - Store information to create
 * @returns {object} Created store (201)
 */
router.post('/', createStore);

/**
 * PATCH /stores/:id
 * Update store information (admin only)
 * @param {string} id - Store ID
 * @param {object} updateData - Fields to update
 * @returns {object} Updated store (200)
 */
router.patch('/:id', updateStore);

/**
 * DELETE /stores/:id
 * Delete store (admin only)
 * @param {string} id - Store ID
 * @returns {object} Deletion confirmation (200)
 */
router.delete('/:id', deleteStore);

export default router;
