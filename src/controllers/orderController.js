import Order from '../models/orderModel.js';
import AppError from '../utils/appError.js';

export const getOrders = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
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
        orders,
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

export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user._id;

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
      data: order,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return next(new AppError('Invalid order ID format', 400));
    }
    next(error);
  }
};

export const downloadInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user._id;

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
    const invoiceContent = generateInvoiceContent(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.send(invoiceContent);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return next(new AppError('Invalid order ID format', 400));
    }
    next(error);
  }
};

// Generate minimal PDF (mock invoice for demo)
// In production, use pdfkit, puppeteer, or html-pdf
function generateInvoiceContent(order) {
  const textContent = `
QUICKCART INVOICE

Order ID: ${order._id}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Time: ${new Date(order.createdAt).toLocaleTimeString()}

STORE INFORMATION
${order.storeName || 'Store'}
${order.storeAddress || 'Address not available'}

ITEMS PURCHASED
${order.items
  ?.map(
    (item, idx) =>
      `${idx + 1}. ${item.name || item.productName}
   Quantity: ${item.quantity}x @ $${(item.price || item.unitPrice || 0).toFixed(2)}
   Subtotal: $${((item.price || item.unitPrice || 0) * item.quantity).toFixed(2)}`
  )
  .join('\n\n')}

ORDER SUMMARY
Subtotal: $${(order.subtotal || 0).toFixed(2)}
Tax: $${(order.tax || 0).toFixed(2)}
Discount: -$${(order.discount || 0).toFixed(2)}
---
TOTAL: $${(order.total || 0).toFixed(2)}

PAYMENT
Method: ${order.paymentMethod || 'Card'}
Status: ${order.paymentStatus || 'Pending'}

Thank you for shopping with QuickCart!
`;

  // Create a simple PDF-like response
  // Note: This is a text representation. For real PDFs, install pdfkit:
  // npm install pdfkit
  return Buffer.from(textContent, 'utf-8');
}
