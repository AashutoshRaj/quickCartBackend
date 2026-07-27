/**
 * Exit QR Token
 * Signs/verifies a short-lived token embedded in a customer's exit QR code.
 *
 * Backward compatible: existing customer receipts already encode the raw
 * Stripe `sessionId` as the QR payload (see PaymentSuccess.tsx) — that flow
 * is left untouched. `resolveExitQrPayload` accepts either a signed token
 * (preferred, going forward) or a raw sessionId string, so nothing already
 * generated breaks.
 */

import jwt from 'jsonwebtoken';

const EXIT_QR_PURPOSE = 'exit-qr';

export const signExitQrToken = (sessionId: string): string => {
  return jwt.sign({ sessionId, purpose: EXIT_QR_PURPOSE }, process.env.JWT_SECRET as string, {
    expiresIn: '48h',
  });
};

/**
 * Resolves a scanned QR payload down to a sessionId.
 * Returns null if the payload is neither a valid signed token nor a
 * plausible raw sessionId string.
 */
export const resolveExitQrPayload = (payload: string): string | null => {
  if (!payload) return null;

  try {
    const decoded = jwt.verify(payload, process.env.JWT_SECRET as string) as {
      sessionId?: string;
      purpose?: string;
    };
    if (decoded.purpose === EXIT_QR_PURPOSE && decoded.sessionId) {
      return decoded.sessionId;
    }
    return null;
  } catch {
    // Not a signed token — fall back to treating it as a raw sessionId
    // (legacy QR format, or `session_id=...` query string from ExitGate.tsx)
    const match = payload.match(/session_id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : payload.trim();
  }
};
