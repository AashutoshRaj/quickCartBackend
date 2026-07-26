/**
 * Resolves the storeId for the currently authenticated admin/store-owner
 */

import { Request } from 'express';
import Store from '../models/storeModel.ts';
import AppError from './appError.ts';

/**
 * Looks up the Store document belonging to the authenticated user and
 * returns its storeId. Never trusts a storeId supplied by the client
 * (request body, query, or uploaded file) — the store is always derived
 * from the logged-in session.
 *
 * Falls back to the sole active store when the admin's email isn't set
 * (e.g. phone-only login), matching the single-store assumption already
 * used elsewhere in this codebase (saveStoreProfile, generateStoreQRCode).
 */
export const getAuthenticatedStoreId = async (req: Request): Promise<string> => {
  if (!(req as any).user) {
    throw new AppError('User authentication required', 401);
  }

  const authUserEmail = (req as any).user?.email;
  let store = authUserEmail ? await Store.findOne({ email: authUserEmail }) : null;

  if (!store) {
    store = await Store.findOne({ status: 'active' });
  }

  if (!store) {
    throw new AppError('Store profile not found. Please complete your store profile setup first.', 404);
  }

  return store.storeId;
};
