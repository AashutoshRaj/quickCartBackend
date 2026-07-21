import { Router } from 'express';
import {
  scanStore,
  scanStorePublic,
  getAllStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  regenerateQRCode,
  getStoreProfile,
  saveStoreProfile,
  generateStoreQRCode,
} from '../../controllers/storeController.ts';

const router = Router();

/**
 * Admin Store Profile Endpoints
 */

/**
 * GET /stores/profile
 * Get admin's store profile (admin only)
 * @returns {object} Store profile details (200)
 */
router.get('/profile', getStoreProfile);

/**
 * POST/PATCH /stores/profile
 * Save or update admin's store profile (admin only)
 * @param {object} storeData - Store information to save
 * @returns {object} Saved store profile (200)
 */
router.post('/profile', saveStoreProfile);
router.patch('/profile', saveStoreProfile);

/**
 * POST /stores/profile/generate-qr
 * Generate QR code for admin's store (admin only)
 * @returns {object} Store with generated QR code (200)
 */
router.post('/profile/generate-qr', generateStoreQRCode);

/**
 * Public Store Endpoints
 */

/**
 * GET /stores/scan/:storeId
 * Scan store by QR code or manual ID (public route, legacy)
 * @param {string} storeId - Store ID or QR code identifier
 * @returns {object} Store details (200)
 */
router.get('/scan/:storeId', scanStore);

/**
 * GET /stores/:storeId/public
 * Get public store information for customers via QR scan
 * Used by QuickCart Customer App to fetch store details
 * @param {string} storeId - Store MongoDB ID
 * @returns {object} Public store information (200)
 */
router.get('/:storeId/public', scanStorePublic);

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
 * POST /stores/:id/qr/regenerate
 * Regenerate QR code for store (admin only)
 * @param {string} id - Store ID
 * @returns {object} Store with regenerated QR code (200)
 */
router.post('/:id/qr/regenerate', regenerateQRCode);

/**
 * DELETE /stores/:id
 * Delete store (admin only)
 * @param {string} id - Store ID
 * @returns {object} Deletion confirmation (200)
 */
router.delete('/:id', deleteStore);

export default router;
