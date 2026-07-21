/**
 * Store Controller
 * Handles store CRUD operations and store information retrieval
 */

import { Request, Response, NextFunction } from 'express';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';
import type { IStore, CreateStoreRequest } from '../types/index';

/**
 * Response type for single store endpoint
 */
interface SingleStoreResponse {
  status: string;
  data: { store: Partial<IStore> & Record<string, unknown> };
}

/**
 * Response type for stores list endpoint
 */
interface StoresListResponse {
  status: string;
  results: number;
  data: { stores: IStore[] };
}

/**
 * Response type for delete endpoint
 */
interface DeleteStoreResponse {
  status: string;
  data: null;
}

/**
 * Retrieves store details by store ID or MongoDB ID
 * Used for store scanning/lookup functionality
 * @param req - Express request with store ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if store not found or inactive/closed
 */
export const scanStore = async (
  req: Request<{ storeId: string }, SingleStoreResponse>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!storeId || storeId.trim().length === 0) {
      return next(new AppError('Store ID is required', 400));
    }

    const trimmedId = storeId.trim();

    // Try to find store by storeId first (new schema)
    let store = await Store.findOne({ storeId: trimmedId });

    // If not found, try by _id (Admin schema)
    if (!store) {
      store = await Store.findById(trimmedId);
    }

    if (!store) {
      return next(new AppError('Store not found with this ID', 404));
    }

    // Check if store is active
    if (store.status === 'inactive') {
      return next(new AppError('Store is currently inactive', 400));
    }

    if (store.status === 'closed') {
      return next(new AppError('Store is closed', 400));
    }

    // Return all store details with normalized field names
    const storeObj = store.toObject ? store.toObject() : store;

    const storeResponse = {
      ...(storeObj as Record<string, unknown>),
      storeId: (storeObj as Record<string, unknown>).storeId || (storeObj as Record<string, unknown>)._id?.toString?.(),
      name: (storeObj as Record<string, unknown>).name || (storeObj as Record<string, unknown>).storeName,
      storeName: (storeObj as Record<string, unknown>).storeName || (storeObj as Record<string, unknown>).name,
      phoneNumber: (storeObj as Record<string, unknown>).phoneNumber || (storeObj as Record<string, unknown>).phone,
    };

    res.status(200).json({
      status: 'success',
      data: { store: storeResponse },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all active stores
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const getAllStores = async (
  req: Request,
  res: Response<StoresListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const stores = await Store.find({ status: 'active' });
    res.status(200).json({
      status: 'success',
      results: stores.length,
      data: { stores },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single store by ID
 * @param req - Express request with store ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if store not found
 */
export const getStore = async (
  req: Request<{ id: string }, SingleStoreResponse>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return next(new AppError('No store found with that ID', 404));

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new store
 * @param req - Express request with store details in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError on validation errors
 */
export const createStore = async (
  req: Request<never, SingleStoreResponse, CreateStoreRequest>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const newStore = await Store.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { store: newStore },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates an existing store by ID
 * @param req - Express request with store ID in params and update data in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if store not found
 */
export const updateStore = async (
  req: Request<{ id: string }, SingleStoreResponse, Partial<CreateStoreRequest>>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!store) return next(new AppError('No store found with that ID', 404));

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a store by ID
 * @param req - Express request with store ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if store not found
 */
export const deleteStore = async (
  req: Request<{ id: string }, DeleteStoreResponse>,
  res: Response<DeleteStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return next(new AppError('No store found with that ID', 404));

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
