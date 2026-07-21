/**
 * QR Code Generator Utility
 * Generates and manages QR codes for store identification
 */

import QRCode from 'qrcode';

interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  quality?: number;
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code data URL (PNG format by default)
 * @param storeId - Unique store identifier
 * @param options - QR code generation options
 * @returns Promise<string> - Data URL of QR code
 */
export const generateQRCodeDataURL = async (
  storeId: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  try {
    const qrContent = `https://quickcart.app/store/${storeId}`;

    const defaultOptions: QRCodeOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    };

    const dataURL = await QRCode.toDataURL(qrContent, defaultOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as SVG string
 * @param storeId - Unique store identifier
 * @returns Promise<string> - SVG string of QR code
 */
export const generateQRCodeSVG = async (storeId: string): Promise<string> => {
  try {
    const qrContent = `https://quickcart.app/store/${storeId}`;

    const svgString = await QRCode.toString(qrContent, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return svgString;
  } catch (error) {
    console.error('Error generating QR SVG:', error);
    throw new Error('Failed to generate QR SVG');
  }
};

/**
 * Generate QR code and return as Buffer (PNG)
 * @param storeId - Unique store identifier
 * @returns Promise<Buffer> - PNG buffer of QR code
 */
export const generateQRCodeBuffer = async (storeId: string): Promise<Buffer> => {
  try {
    const qrContent = `https://quickcart.app/store/${storeId}`;

    const buffer = await QRCode.toBuffer(qrContent, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return buffer;
  } catch (error) {
    console.error('Error generating QR buffer:', error);
    throw new Error('Failed to generate QR buffer');
  }
};

/**
 * Validate QR code content format
 * @param qrContent - QR code content to validate
 * @returns boolean - True if valid store QR format
 */
export const isValidStoreQRCode = (qrContent: string): boolean => {
  const storeQRPattern = /^https:\/\/quickcart\.app\/store\/[a-f0-9]{24}$/i;
  return storeQRPattern.test(qrContent);
};

/**
 * Extract store ID from QR code content
 * @param qrContent - QR code content/URL
 * @returns string | null - Extracted store ID or null if invalid
 */
export const extractStoreIdFromQR = (qrContent: string): string | null => {
  try {
    const url = new URL(qrContent);
    const pathParts = url.pathname.split('/');
    const storeId = pathParts[pathParts.length - 1];

    // Validate MongoDB ObjectId format (24 hex characters)
    if (/^[a-f0-9]{24}$/i.test(storeId)) {
      return storeId;
    }

    return null;
  } catch {
    return null;
  }
};
