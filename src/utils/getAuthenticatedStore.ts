/**
 * Resolves the storeId for the currently authenticated admin/store-owner
 */

import { Request } from 'express';
import Store from '../models/storeModel.ts';
import User from '../models/userModel.ts';
import AppError from './appError.ts';

/**
 * Looks up the Store document belonging to the authenticated user and
 * returns its storeId. Never trusts a storeId supplied by the client
 * (request body, query, or uploaded file) — the store is always derived
 * from the logged-in session.
 *
 * Resolution order (each step scoped to THIS user only — never falls back
 * to "any" store, since that would leak one store's data to another admin):
 *   1. Store.ownerId === the authenticated user's _id (fast, reliable path)
 *   2. Store.email === the authenticated user's email (legacy stores created
 *      before ownerId existed) — backfills ownerId once found, so future
 *      calls take the fast path
 *   3. Neither resolves -> 404, admin must complete store profile setup
 */
export const getAuthenticatedStoreId = async (req: Request): Promise<string> => {
  const userId = (req as any).user?._id;

  if (!userId) {
    throw new AppError('User authentication required', 401);
  }

  let store = await Store.findOne({ ownerId: userId });

  if (!store) {
    let authUserEmail = (req as any).user?.email;

    // req.user may be a stale/partial copy (e.g. set before an in-request
    // update) - refetch from DB when email isn't present on it
    if (!authUserEmail) {
      const userDoc = await User.findById(userId);
      authUserEmail = userDoc?.email;
    }

    if (authUserEmail) {
      store = await Store.findOne({ email: authUserEmail });
      if (store && !store.ownerId) {
        store.ownerId = userId;
        await store.save();
      }
    }
  }

  if (!store) {
    throw new AppError('Store profile not found. Please complete your store profile setup first.', 404);
  }

  return store.storeId;
};
