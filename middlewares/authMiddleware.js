import { verifyAccessToken } from '../src/utils/token.js';
import { sendError } from '../src/utils/response.js';

/**
 * Middleware: Verify JWT access token from Authorization header.
 * Attaches decoded admin data to req.admin on success.
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please refresh your session.', 401);
    }
    return sendError(res, 'Invalid token.', 401);
  }
};

/**
 * Middleware: Check that the authenticated user has admin or superadmin role.
 * Must be used after requireAuth.
 */
export const requireAdmin = (req, res, next) => {
  // requireAuth already ran, so req.admin is available
  if (!req.admin) {
    return sendError(res, 'Authentication required.', 401);
  }
  // For now all authenticated users through this system are admins
  next();
};

/**
 * Middleware: Restrict to superadmin only
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return sendError(res, 'Superadmin access required.', 403);
  }
  next();
};
