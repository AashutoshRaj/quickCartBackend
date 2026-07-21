/**
 * Custom AppError class for operational errors
 * Extends Error and adds HTTP status code and operational flag
 * Used for expected errors that should be communicated to clients
 */
class AppError extends Error {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Status description: 'fail' for 4xx errors, 'error' for 5xx
   */
  status: string;

  /**
   * Flag indicating this is an operational error (expected and safe to send to client)
   */
  isOperational: boolean;

  /**
   * Create an operational error with status code and message
   * @param message - Error message to display
   * @param statusCode - HTTP status code (determines if 'fail' or 'error' status)
   */
  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
