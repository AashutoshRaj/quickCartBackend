/**
 * Store Controller
 * Handles store CRUD operations and store information retrieval
 */

import { Request, Response, NextFunction } from 'express';
import Store from '../models/storeModel.ts';
import User from '../models/userModel.ts';
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
      (newStore as any).qrGeneratedAt = new Date();
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
      (store as any).qrGeneratedAt = new Date();
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
 * Auto-creates store on first visit if it doesn't exist
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
    let authUserEmail = (req as any).user?.email;
    const userId = (req as any).user?._id;

    console.log('getStoreProfile: userId =', userId);
    console.log('getStoreProfile: authUserEmail =', authUserEmail);

    // If email not in req.user, fetch user again to get email
    if (!authUserEmail && userId) {
      console.log('getStoreProfile: Email missing, fetching user by ID...');
      const userDoc = await User.findById(userId);
      authUserEmail = userDoc?.email;
      console.log('getStoreProfile: Fetched email:', authUserEmail);
    }

    if (!authUserEmail) {
      console.error('getStoreProfile: No authenticated user email found');
      return next(new AppError('User authentication required', 401));
    }

    // Try to find store by email (admin's email)
    let store = await Store.findOne({ email: authUserEmail });
    console.log('getStoreProfile: Store found?', !!store);

    // If no store exists, create one with user's signup data
    if (!store) {
      console.log('getStoreProfile: No store found. Creating new store...');
      console.log('getStoreProfile: Store create data:', {
        name: (req as any).user?.storeName,
        email: authUserEmail,
        phoneNumber: (req as any).user?.phoneNumber,
      });

      try {
        const storeData = {
          name: (req as any).user?.storeName || 'My Store',
          email: authUserEmail,
          phoneNumber: (req as any).user?.phoneNumber || '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          description: '',
          currency: 'USD',
          timezone: 'UTC',
          storeId: `store_${Date.now()}`,
          status: 'active',
        };

        console.log('getStoreProfile: Creating store with data:', storeData);
        const newStore = await Store.create(storeData);
        console.log('getStoreProfile: Store created successfully:', {
          _id: newStore._id,
          name: newStore.name,
          email: newStore.email,
          phoneNumber: newStore.phoneNumber,
        });

        // Auto-generate QR code
        try {
          const { generateQRCodeDataURL } = await import('../utils/qrCodeGenerator.ts');
          const qrCodeDataURL = await generateQRCodeDataURL(newStore._id!.toString());
          newStore.qrCode = qrCodeDataURL;
          (newStore as any).qrGeneratedAt = new Date();
          await newStore.save();
          console.log('getStoreProfile: QR code generated');
        } catch (qrError) {
          console.warn('getStoreProfile: QR code generation failed:', qrError);
        }

        store = newStore;

        // Persist real storeId onto admin's user record so product/import/cart
        // controllers (which read req.user.storeName as the storeId) work correctly
        if ((req as any).user?._id) {
          await User.findByIdAndUpdate((req as any).user._id, { storeName: store.storeId });
          (req as any).user.storeName = store.storeId;
        }
      } catch (createErr: any) {
        console.error('getStoreProfile: Error creating store:', createErr.message);
        console.error('getStoreProfile: Error code:', createErr.code);
        console.error('getStoreProfile: Full error:', createErr);

        // If auto-create fails, return empty store instead of error
        console.log('getStoreProfile: Returning default store due to create error');
        return res.status(200).json({
          status: 'success',
          data: {
            store: {
              name: (req as any).user?.storeName || '',
              email: authUserEmail,
              phoneNumber: (req as any).user?.phoneNumber || '',
              address: '',
              city: '',
              state: '',
              country: '',
              postalCode: '',
              description: '',
              currency: 'USD',
              timezone: 'UTC',
              status: 'active',
            },
          },
        });
      }
    }

    // Self-heal: keep admin user's storeName in sync with the real storeId,
    // so product/import/cart controllers reading req.user.storeName stay correct
    if ((req as any).user?._id && (req as any).user?.storeName !== store.storeId) {
      await User.findByIdAndUpdate((req as any).user._id, { storeName: store.storeId });
      (req as any).user.storeName = store.storeId;
    }

    console.log('getStoreProfile: Returning store:', {
      _id: store._id,
      name: store.name,
      email: store.email,
      phoneNumber: store.phoneNumber,
    });

    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    console.error('getStoreProfile: Unexpected error:', err);
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
    console.log('saveStoreProfile - incoming data:', storeData);

    // Get authenticated user's email - ALWAYS use this, never trust frontend email
    const authUserEmail = (req as any).user?.email;
    if (!authUserEmail) {
      return next(new AppError('User authentication required', 401));
    }
    console.log('Auth user email (from user account):', authUserEmail);

    // Validate required fields
    if (!storeData.name?.trim()) {
      return next(new AppError('Store name is required', 400));
    }

    // ALWAYS use authenticated user's email - security: never trust frontend email
    const emailToUse = authUserEmail;
    console.log('Store profile email set to:', emailToUse);

    if (!storeData.phoneNumber?.trim()) {
      return next(new AppError('Phone number is required', 400));
    }
    if (!storeData.address?.trim()) {
      return next(new AppError('Address is required', 400));
    }

    // TODO: Get storeId from authenticated user/context
    // For now, update or create first store
    let store = await Store.findOne({ status: 'active' });
    console.log('Found existing store:', store?._id);

    if (store) {
      // Update existing store - set all fields explicitly
      store.name = storeData.name || store.name;
      store.phoneNumber = storeData.phoneNumber || store.phoneNumber;
      store.address = storeData.address || store.address;
      store.city = storeData.city || store.city;
      store.state = storeData.state || store.state;
      store.country = storeData.country || store.country;
      store.postalCode = storeData.postalCode || store.postalCode;
      store.description = storeData.description || store.description;
      store.currency = storeData.currency || store.currency;
      store.timezone = storeData.timezone || store.timezone;
      store.logo = storeData.logo !== undefined ? storeData.logo : store.logo;
      store.email = emailToUse;
      store.status = storeData.status || store.status;

      // Handle businessHours if provided
      if (storeData.businessHours && Array.isArray(storeData.businessHours)) {
        store.businessHours = storeData.businessHours;
      }

      console.log('Updating store with fields:', {
        name: store.name,
        city: store.city,
        state: store.state,
        country: store.country,
        postalCode: store.postalCode,
        description: store.description,
      });

      await store.save();
      console.log('Store updated successfully:', store._id);
    } else {
      // Create new store (admin's first profile save)
      const newStoreData = {
        name: storeData.name,
        email: emailToUse,
        phoneNumber: storeData.phoneNumber,
        address: storeData.address,
        city: storeData.city || '',
        state: storeData.state || '',
        country: storeData.country || '',
        postalCode: storeData.postalCode || '',
        description: storeData.description || '',
        currency: storeData.currency || 'USD',
        timezone: storeData.timezone || 'UTC',
        logo: storeData.logo || null,
        storeId: storeData.storeId || `store_${Date.now()}`,
        status: 'active',
        businessHours: storeData.businessHours || [],
      };

      console.log('Creating new store with data:', newStoreData);
      store = await Store.create(newStoreData);
      console.log('Store created successfully:', store._id);

      // Auto-generate QR code
      try {
        const qrCodeDataURL = await generateQRCodeDataURL(store._id!.toString());
        store.qrCode = qrCodeDataURL;
        (store as any).qrGeneratedAt = new Date();
        await store.save();
        console.log('QR code generated:', store.qrCode?.substring(0, 50) + '...');
      } catch (qrError) {
        console.warn('QR code auto-generation failed:', qrError);
      }
    }

    // Self-heal: keep admin user's storeName in sync with the real storeId,
    // so product/import/cart controllers reading req.user.storeName stay correct
    if ((req as any).user?._id && (req as any).user?.storeName !== store.storeId) {
      await User.findByIdAndUpdate((req as any).user._id, { storeName: store.storeId });
      (req as any).user.storeName = store.storeId;
    }

    console.log('Sending response:', store);
    res.status(200).json({
      status: 'success',
      data: { store },
    });
  } catch (err) {
    console.error('saveStoreProfile error:', err);
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
      (store as any).qrGeneratedAt = new Date();
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
