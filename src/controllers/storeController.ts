/**
 * Store Controller
 * Handles store CRUD operations and store information retrieval
 */

import { Request, Response, NextFunction } from 'express';
import Store from '../models/storeModel.ts';
import AppError from '../utils/appError.ts';
import { generateQRCodeDataURL } from '../utils/qrCodeGenerator.ts';
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
 * Scan store by ID and return public information for customers
 * Used by QuickCart Customer App to fetch store details via QR code
 * @param req - Express request with storeId in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void - Returns only public store information
 * @throws AppError if store not found or inactive
 */
export const scanStorePublic = async (
  req: Request<{ storeId: string }, SingleStoreResponse>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId } = req.params;

    if (!storeId || storeId.trim().length === 0) {
      return next(new AppError('Store ID is required', 400));
    }

    const store = await Store.findById(storeId.trim());

    if (!store) {
      return next(new AppError('Store not found', 404));
    }

    if (store.status !== 'active') {
      return next(new AppError('Store is not currently available', 400));
    }

    // Return only public store information for customers
    const publicStoreInfo = {
      _id: store._id,
      storeId: store._id?.toString(),
      name: store.name,
      logo: store.logo || null,
      address: store.address,
      currency: store.currency,
      timezone: store.timezone,
      status: store.status,
    };

    res.status(200).json({
      status: 'success',
      data: { store: publicStoreInfo },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new store with auto-generated QR code
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

    // Auto-generate QR code for the store
    try {
      const qrCodeDataURL = await generateQRCodeDataURL(newStore._id!.toString());
      newStore.qrCode = qrCodeDataURL;
      await newStore.save();
    } catch (qrError) {
      console.warn('QR code generation failed, continuing without QR:', qrError);
    }

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
 * Regenerates QR code if needed
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

    // Regenerate QR code if it doesn't exist
    if (!store.qrCode) {
      try {
        const qrCodeDataURL = await generateQRCodeDataURL(store._id!.toString());
        store.qrCode = qrCodeDataURL;
        await store.save();
      } catch (qrError) {
        console.warn('QR code regeneration failed:', qrError);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Regenerate QR code for a store
 * Admin can regenerate QR code if needed
 * @param req - Express request with store ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if store not found
 */
export const regenerateQRCode = async (
  req: Request<{ id: string }, SingleStoreResponse>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return next(new AppError('No store found with that ID', 404));

    try {
      const qrCodeDataURL = await generateQRCodeDataURL(store._id!.toString());
      store.qrCode = qrCodeDataURL;
      await store.save();

      res.status(200).json({
        status: 'success',
        data: { store },
      });
    } catch (qrError) {
      return next(new AppError('Failed to regenerate QR code', 500));
    }
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

/**
 * Get admin's store profile
 * Admin accesses their store profile from settings
 * @param req - Express request with userId from auth
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const getStoreProfile = async (
  req: Request,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // TODO: Get storeId from authenticated user/context
    // For now, fetch the first active store
    const store = await Store.findOne({ status: 'active' });

    if (!store) {
      return next(new AppError('No store profile found. Please create one first.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save or update admin's store profile
 * Admin saves store details from settings page
 * @param req - Express request with store data in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const saveStoreProfile = async (
  req: Request<never, SingleStoreResponse, Partial<IStore>>,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeData = req.body;

    // Validate required fields
    if (!storeData.name?.trim()) {
      return next(new AppError('Store name is required', 400));
    }
    if (!storeData.email?.trim()) {
      return next(new AppError('Email is required', 400));
    }
    if (!storeData.phoneNumber?.trim()) {
      return next(new AppError('Phone number is required', 400));
    }
    if (!storeData.address?.trim()) {
      return next(new AppError('Address is required', 400));
    }

    // TODO: Get storeId from authenticated user/context
    // For now, update or create first store
    let store = await Store.findOne({ status: 'active' });

    if (store) {
      // Update existing store
      Object.assign(store, storeData);
      await store.save();
    } else {
      // Create new store (admin's first profile save)
      // Generate storeId if not provided
      const newStoreData = {
        ...storeData,
        storeId: storeData.storeId || `store_${Date.now()}`,
      };
      store = await Store.create(newStoreData);

      // Auto-generate QR code
      try {
        const qrCodeDataURL = await generateQRCodeDataURL(store._id!.toString());
        store.qrCode = qrCodeDataURL;
        await store.save();
      } catch (qrError) {
        console.warn('QR code auto-generation failed:', qrError);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate QR code for admin's store
 * Admin generates QR from settings page
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 */
export const generateStoreQRCode = async (
  req: Request,
  res: Response<SingleStoreResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // TODO: Get storeId from authenticated user/context
    // For now, generate for first active store
    const store = await Store.findOne({ status: 'active' });

    if (!store) {
      return next(new AppError('No store found. Please create store profile first.', 404));
    }

    // Generate new QR code
    try {
      const qrCodeDataURL = await generateQRCodeDataURL(store._id!.toString());
      store.qrCode = qrCodeDataURL;
      await store.save();

      res.status(200).json({
        status: 'success',
        data: { store },
      });
    } catch (qrError) {
      return next(new AppError('Failed to generate QR code', 500));
    }
  } catch (err) {
    next(err);
  }
};
