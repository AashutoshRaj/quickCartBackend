/**
 * Staff Verification Controller
 * Security Guard dashboard, exit-QR verification and exit approval.
 * All handlers here require `protectStaff` (see routes/v1/staffRoutes.ts)
 * and read the authenticated actor from `req.staffActor`.
 */

import { Request, Response, NextFunction } from 'express';
import Order from '../models/orderModel.ts';
import Product from '../models/productModel.ts';
import Store from '../models/storeModel.ts';
import User from '../models/userModel.ts';
import SecurityGuard from '../models/securityGuardModel.ts';
import ExitVerification from '../models/exitVerificationModel.ts';
import AppError from '../utils/appError.ts';
import { resolveExitQrPayload } from '../utils/exitQrToken.ts';

/**
 * How long after payment an exit QR remains valid for verification
 */
const EXIT_QR_VALID_HOURS = 48;

/**
 * GET /staff/profile — current staff actor's own profile
 */
export const getStaffProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.staffActor!;
    const store = await Store.findOne({ storeId: actor.storeId }).select('name');

    let extra: Record<string, unknown> = {};
    if (actor.actorType === 'guard') {
      const guard = await SecurityGuard.findById(actor.id).select('shift status photo');
      extra = { shift: guard?.shift, status: guard?.status, photo: guard?.photo };
    }

    res.status(200).json({
      status: 'success',
      data: { ...actor, storeName: store?.name || actor.storeId, ...extra },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /staff/dashboard/stats — Security Dashboard summary + recent activity
 */
export const getStaffDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.staffActor!;

    const guard = actor.actorType === 'guard' ? await SecurityGuard.findById(actor.id) : null;
    const store = await Store.findOne({ storeId: actor.storeId }).select('name');

    const recentActivity = await ExitVerification.find({ guardId: actor.id })
      .sort({ verifiedAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        guardName: `${actor.firstName} ${actor.lastName}`,
        storeName: store?.name || actor.storeId,
        shift: guard?.shift || null,
        status: guard?.status || 'active',
        todayVerifications: guard?.todayVerifications || 0,
        totalOrdersVerified: guard?.totalOrdersVerified || 0,
        reportedIssuesCount: guard?.reportedIssuesCount || 0,
        recentActivity: recentActivity.map((v) => ({
          orderNumber: v.orderNumber,
          customerName: v.customerName,
          totalAmount: v.totalAmount,
          verifiedAt: v.verifiedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Shared lookup: resolves a scanned QR payload down to an order + verification
 * result bucket, without mutating anything. Used by both the scan-check and
 * approve endpoints so approve re-validates from scratch (no trusting client state).
 */
const resolveOrderForVerification = async (rawPayload: string, storeId: string) => {
  const sessionId = resolveExitQrPayload(rawPayload);
  if (!sessionId) {
    return { result: 'invalid' as const };
  }

  const order = await Order.findOne({ sessionId });
  if (!order) {
    return { result: 'invalid' as const };
  }

  if (order.storeId !== storeId) {
    // Don't leak that the order exists in a different store — same as invalid
    return { result: 'invalid' as const };
  }

  if (order.paymentStatus !== 'completed') {
    return { result: 'payment_failed' as const, order };
  }

  const existingVerification = await ExitVerification.findOne({ sessionId });
  if (existingVerification || order.status === 'exited') {
    return { result: 'already_verified' as const, order, verification: existingVerification };
  }

  const referenceTime = order.paidAt || order.createdAt;
  const ageHours = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60);
  if (ageHours > EXIT_QR_VALID_HOURS) {
    return { result: 'invalid' as const };
  }

  return { result: 'success' as const, order };
};

/**
 * POST /staff/verify — scan-check only, does not mutate anything
 * Body: { qrPayload: string }
 */
export const verifyExitQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.staffActor!;
    const { qrPayload } = req.body as { qrPayload?: string };

    if (!qrPayload) {
      return next(new AppError('qrPayload is required', 400));
    }

    const resolution = await resolveOrderForVerification(qrPayload, actor.storeId);

    if (resolution.result === 'invalid') {
      res.status(200).json({ status: 'success', data: { result: 'invalid' } });
      return;
    }

    if (resolution.result === 'payment_failed') {
      res.status(200).json({
        status: 'success',
        data: {
          result: 'payment_failed',
          orderNumber: resolution.order.sessionId,
        },
      });
      return;
    }

    if (resolution.result === 'already_verified') {
      res.status(200).json({
        status: 'success',
        data: {
          result: 'already_verified',
          orderNumber: resolution.order.sessionId,
          verifiedAt: resolution.verification?.verifiedAt || resolution.order.exitedAt,
          verifiedBy: resolution.verification?.guardName || 'Another guard',
        },
      });
      return;
    }

    const order = resolution.order;
    const customer = await User.findById(order.customerId).select('name');

    const items = await Promise.all(
      order.items.map(async (item: any) => {
        const product = item.productId ? await Product.findById(item.productId).select('image barcode') : null;
        return {
          name: item.name || item.productName,
          quantity: item.quantity,
          price: item.price ?? item.unitPrice,
          image: product?.image || null,
          barcode: product?.barcode || null,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        result: 'success',
        sessionId: order.sessionId,
        orderNumber: order.sessionId,
        customerName: customer?.name || 'Customer',
        storeName: actor.storeId,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
        totalAmount: order.total,
        itemsCount: order.items.length,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /staff/verify/:sessionId/approve — approve exit, write audit record
 * Re-validates everything from scratch (never trusts the earlier scan-check call).
 */
export const approveExit = async (
  req: Request<{ sessionId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.staffActor!;
    if (actor.actorType !== 'guard') {
      return next(new AppError('Only Security Guards can approve exits.', 403));
    }

    const { sessionId } = req.params;
    const resolution = await resolveOrderForVerification(sessionId, actor.storeId);

    if (resolution.result !== 'success') {
      return next(new AppError('This order cannot be approved for exit right now.', 409));
    }

    const order = resolution.order;
    const customer = await User.findById(order.customerId).select('name');

    try {
      await ExitVerification.create({
        sessionId: order.sessionId,
        orderId: String(order._id),
        orderNumber: order.sessionId,
        storeId: actor.storeId,
        guardId: actor.id,
        guardName: `${actor.firstName} ${actor.lastName}`,
        customerName: customer?.name || 'Customer',
        totalAmount: order.total,
        itemsCount: order.items.length,
        verifiedAt: new Date(),
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        // Lost a race to another concurrent approval for the same session
        return next(new AppError('This order has already been verified.', 409));
      }
      throw err;
    }

    order.status = 'exited';
    order.exitedAt = new Date();
    await order.save();

    await SecurityGuard.findByIdAndUpdate(actor.id, {
      $inc: {
        todayVerifications: 1,
        weekVerifications: 1,
        monthVerifications: 1,
        totalOrdersVerified: 1,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        result: 'approved',
        orderNumber: order.sessionId,
        verifiedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};
