/**
 * Order Controller
 * Handles order retrieval, invoice generation, and order history
 */

import { Request, Response, NextFunction } from 'express';
import Order from '../models/orderModel.ts';
import AppError from '../utils/appError.ts';
import type { IOrder } from '../types/index.ts';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'AED'] as const;

type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const normalizeCurrencyCode = (currency?: string): CurrencyCode => {
  if (!currency || typeof currency !== 'string') {
    return 'USD';
  }

  const normalized = currency.toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized as CurrencyCode) ? (normalized as CurrencyCode) : 'USD';
};

const formatOrderCurrency = (value: number, currency?: string, maximumFractionDigits = 2): string => {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Response type for orders list
 */
interface OrdersListResponse {
  status: string;
  data: {
    orders: IOrder[];
    totalOrders: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Response type for single order
 */
interface SingleOrderResponse {
  status: string;
  data: IOrder;
}

/**
 * Retrieves paginated orders for the current user
 * Excludes pending orders from results
 * @param req - Express request with authenticated user and query parameters
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if pagination parameters are invalid
 */
export const getOrders = async (
  req: Request,
  res: Response<OrdersListResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return next(new AppError('Invalid pagination parameters', 400));
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find({ customerId, status: { $ne: 'pending' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ customerId, status: { $ne: 'pending' } }),
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      status: 'success',
      data: {
        orders: orders as IOrder[],
        totalOrders,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single order by ID
 * Validates that the order belongs to the authenticated user
 * @param req - Express request with order ID in params
 * @param res - Express response
 * @param next - Express next function
 * @returns void
 * @throws AppError if order not found or not authorized to view
 */
export const getOrderById = async (
  req: Request<{ orderId: string }, SingleOrderResponse>,
  res: Response<SingleOrderResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?._id;

    // Validate orderId format
    if (!orderId || orderId.trim().length === 0) {
      return next(new AppError('Order ID is required', 400));
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId,
    }).lean();

    if (!order) {
      return next(new AppError('Order not found or you do not have permission to view it', 404));
    }

    res.status(200).json({
      status: 'success',
      data: order as IOrder,
    });
  } catch (error) {
    if ((error as Record<string, unknown>).kind === 'ObjectId') {
      return next(new AppError('Invalid order ID format', 400));
    }
    next(error);
  }
};

/**
 * Generates and returns invoice for an order
 * Creates a text-based invoice representation
 * @param req - Express request with order ID in params
 * @param res - Express response with PDF content
 * @param next - Express next function
 * @returns void
 * @throws AppError if order not found or not authorized
 */
export const downloadInvoice = async (
  req: Request<{ orderId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?._id;

    if (!orderId || orderId.trim().length === 0) {
      return next(new AppError('Order ID is required', 400));
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId,
    }).lean();

    if (!order) {
      return next(new AppError('Order not found or you do not have permission to download', 404));
    }

    // Generate simple PDF invoice
    const invoiceContent = generateInvoiceContent(order as unknown as Record<string, unknown>);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.send(invoiceContent);
  } catch (error) {
    if ((error as Record<string, unknown>).kind === 'ObjectId') {
      return next(new AppError('Invalid order ID format', 400));
    }
    next(error);
  }
};

/**
 * Generates minimal text-based invoice content
 * In production, should use pdfkit, puppeteer, or html-pdf
 * @param order - Order document
 * @returns Buffer containing invoice content
 */
function generateInvoiceContent(order: Record<string, unknown>): Buffer {
  const orderCurrency = (order.currency as string) || 'USD';
  const items = (order.items || []) as Array<{
    name?: string;
    productName?: string;
    price?: number;
    unitPrice?: number;
    quantity?: number;
  }>;

  const itemsText = items
    ?.map((item, idx) => {
      const unitPrice = (item.price || item.unitPrice || 0) as number;
      const quantity = item.quantity || 0;
      return `${idx + 1}. ${item.name || item.productName}
   Quantity: ${quantity}x @ ${formatOrderCurrency(unitPrice, orderCurrency)}
   Subtotal: ${formatOrderCurrency(unitPrice * quantity, orderCurrency)}`;
    })
    .join('\n\n');

  const textContent = `
QUICKCART INVOICE

Order ID: ${order._id}
Date: ${new Date(order.createdAt as string).toLocaleDateString()}
Time: ${new Date(order.createdAt as string).toLocaleTimeString()}

STORE INFORMATION
${(order.storeName || 'Store') as string}
${(order.storeAddress || 'Address not available') as string}

ITEMS PURCHASED
${itemsText}

ORDER SUMMARY
Subtotal: ${formatOrderCurrency(((order.subtotal || 0) as number), orderCurrency)}
Tax: ${formatOrderCurrency(((order.tax || 0) as number), orderCurrency)}
Discount: -${formatOrderCurrency(((order.discount || 0) as number), orderCurrency)}
---
TOTAL: ${formatOrderCurrency(((order.total || 0) as number), orderCurrency)}

PAYMENT
Method: ${(order.paymentMethod || 'Card') as string}
Status: ${(order.paymentStatus || 'Pending') as string}

Thank you for shopping with QuickCart!
`;

  // Create a simple PDF-like response
  // Note: This is a text representation. For real PDFs, install pdfkit:
  // npm install pdfkit
  return Buffer.from(textContent, 'utf-8');
}
