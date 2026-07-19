import Store from '../models/storeModel.js';
import AppError from '../utils/appError.js';

export const scanStore = async (req, res, next) => {
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
      ...storeObj,
      storeId: storeObj.storeId || storeObj._id.toString(),
      name: storeObj.name || storeObj.storeName,
      phoneNumber: storeObj.phoneNumber || storeObj.phone,
    };

    res.status(200).json({
      status: 'success',
      data: { store: storeResponse },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllStores = async (req, res, next) => {
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

export const getStore = async (req, res, next) => {
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

export const createStore = async (req, res, next) => {
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

export const updateStore = async (req, res, next) => {
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

export const deleteStore = async (req, res, next) => {
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
