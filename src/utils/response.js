/**
 * Custom application error class with HTTP status code support.
 * Extends native Error for structured error handling in Express.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    // Distinguish operational (expected) errors from programming bugs
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard success response format
 */
export const sendSuccess = (res, message, data = null, statusCode = 200, pagination = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

/**
 * Standard error response format
 */
export const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};
