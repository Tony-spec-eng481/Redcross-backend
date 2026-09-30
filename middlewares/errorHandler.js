import { AppError, sendError } from '../src/utils/response.js';

/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers and returns a standardized response.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired.', 401);
  }

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File too large. Maximum size is 10MB.', 400);
  }

  // Default server error
  return sendError(
    res,
    process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
    500
  );
};
