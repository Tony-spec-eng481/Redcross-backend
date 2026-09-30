/**
 * Wraps async route handlers to eliminate try-catch boilerplate.
 * Any thrown error is forwarded to Express's error middleware via next().
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
