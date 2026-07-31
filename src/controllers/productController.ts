/**
 * Product Controller
 * Handles product CRUD operations and search functionality
 */

import { Request, Response, NextFunction } from 'express';
import Product from '../models/productModel.ts';
import ImportHistory from '../models/importHistoryModel.ts';
import AppError from '../utils/appError.ts';
import { getAuthenticatedStoreId } from '../utils/getAuthenticatedStore.ts';
import type { IProduct, CreateProductRequest } from '../types/index';

/**
 * Response type for product list endpoint
 */
interface ProductListResponse {
  data: IProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Response type for single product endpoint
 */
interface SingleProductResponse {
  status: string;
  data: { product: IProduct };
}

/**
 * Response type for delete endpoint
 */
interface DeleteProductResponse {
  status: string;
  data: null;
}

interface ProductCategorySummary {
  name: string;
  productCount: number;
  inventoryUnits: number;
  activeProducts: number;
  inactiveProducts: number;
}

interface CategoryListResponse {
  status: string;
  data: { categories: ProductCategorySummary[] };
}

/**
 * Retrieves category summaries for the authenticated store.
 * Categories are derived from the existing Product.category string field.
 */
export const getCategories = async (
  req: Request,
  res: Response<CategoryListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const categories = await Product.aggregate<ProductCategorySummary>([
      { $match: { storeId } },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Uncategorized'] },
          productCount: { $sum: 1 },
          inventoryUnits: { $sum: { $ifNull: ['$stock', 0] } },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          inactiveProducts: {
            $sum: { $cond: [{ $ne: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          productCount: 1,
          inventoryUnits: 1,
          activeProducts: 1,
          inactiveProducts: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

interface ProductSummaryResponse {
  status: string;
  data: {
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    categories: number;
    lastImportDate: string | null;
    inventoryValue: number;
  };
}

export const getProductSummary = async (
  req: Request,
  res: Response<ProductSummaryResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const summary = await Product.aggregate<{
      totalProducts: number;
      activeProducts: number;
      outOfStock: number;
      inventoryValue: number;
    }>([
      { $match: { storeId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          outOfStock: {
            $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] },
          },
          inventoryValue: {
            $sum: { $multiply: [{ $ifNull: ['$stock', 0] }, { $ifNull: ['$price', 0] }] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          activeProducts: 1,
          outOfStock: 1,
          inventoryValue: 1,
        },
      },
    ]);

    const categories = await Product.distinct('category', { storeId }).then((items) => items.filter(Boolean).length);
    const lastImport = await ImportHistory.findOne({ storeId, importStatus: 'completed' })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        totalProducts: summary?.[0]?.totalProducts ?? 0,
        activeProducts: summary?.[0]?.activeProducts ?? 0,
        outOfStock: summary?.[0]?.outOfStock ?? 0,
        categories,
        lastImportDate: lastImport?.createdAt?.toISOString() ?? null,
        inventoryValue: summary?.[0]?.inventoryValue ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all products with pagination and search functionality
 * Supports filtering by name, barcode, and category
 * @param req - Express request with query parameters (page, limit, search)
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws Database errors
 */
export const getAllProducts = async (
  req: Request<never, ProductListResponse>,
  res: Response<ProductListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;

    const sortMap: Record<string, string> = {
      name: 'name',
      price: 'price',
      stock: 'stock',
      category: 'category',
      createdDate: 'createdAt',
      updatedDate: 'updatedAt',
    };

    const sortField = sortMap[sortBy] || 'createdAt';
    const sort = { [sortField]: sortOrder };

    const category = (req.query.category as string) || '';
    const status = (req.query.status as string) || '';
    const stockStatus = (req.query.stockStatus as string) || '';
    const skip = (page - 1) * limit;
    const storeId = await getAuthenticatedStoreId(req);

    let query: Record<string, unknown> = { storeId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (stockStatus) {
      switch (stockStatus) {
        case 'in-stock':
          query.stock = { $gt: 10 };
          break;
        case 'low-stock':
          query.stock = { $gt: 0, $lte: 10 };
          break;
        case 'out-of-stock':
          query.stock = 0;
          break;
        default:
          break;
      }
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      data: products,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a product by barcode
 * Used for barcode scanning in stores
 * @param req - Express request with barcode in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if barcode is invalid or product not found
 */
export const getProductByBarcode = async (
  req: Request<{ barcode: string }, SingleProductResponse>,
  res: Response<SingleProductResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { barcode } = req.params;
    const { storeId } = req.query;

    // Validate barcode
    if (!barcode || barcode.trim().length === 0) {
      return next(new AppError('Barcode is required', 400));
    }

    // Find product by barcode
    const product = await Product.findOne({ barcode: barcode.trim() });

    if (!product) {
      return next(new AppError('Product not found with this barcode', 404));
    }

    // Validate store if storeId provided (customer app scanning)
    if (storeId) {
      const storeIdStr = Array.isArray(storeId) ? storeId[0] : storeId;
      if (product.storeId !== storeIdStr) {
        return next(new AppError('This product belongs to another store. Please scan the correct store QR code before shopping.', 403));
      }
    }

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new product
 * @param req - Express request with product details in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError on validation errors
 */
export const createProduct = async (
  req: Request<never, SingleProductResponse, CreateProductRequest>,
  res: Response<SingleProductResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const productData = {
      ...req.body,
      storeId,
      createdBy: req.user?.name || 'unknown',
    };

    const newProduct = await Product.create(productData);
    res.status(201).json({
      status: 'success',
      data: { product: newProduct },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single product by ID
 * @param req - Express request with product ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found
 */
export const getProduct = async (
  req: Request<{ id: string }, SingleProductResponse>,
  res: Response<SingleProductResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const product = await Product.findOne({ _id: req.params.id, storeId });
    if (!product) return next(new AppError('No product found with that ID', 404));

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates an existing product by ID
 * @param req - Express request with product ID in params and update data in body
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found
 */
export const updateProduct = async (
  req: Request<{ id: string }, SingleProductResponse, Partial<CreateProductRequest>>,
  res: Response<SingleProductResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);

    // Never let a client reassign a product to another store via update payload
    const { storeId: _ignoredStoreId, ...updateData } = req.body as Partial<CreateProductRequest> & { storeId?: string };

    const product = await Product.findOneAndUpdate({ _id: req.params.id, storeId }, updateData, {
      new: true,
      runValidators: true,
    });
    if (!product) return next(new AppError('No product found with that ID', 404));

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a product by ID
 * @param req - Express request with product ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if product not found
 */
export const deleteProduct = async (
  req: Request<{ id: string }, DeleteProductResponse>,
  res: Response<DeleteProductResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = await getAuthenticatedStoreId(req);
    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId });
    if (!product) return next(new AppError('No product found with that ID', 404));

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
