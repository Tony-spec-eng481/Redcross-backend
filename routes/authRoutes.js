import express from 'express';
import {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
  updateNotificationPreferences,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public auth routes
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected auth routes
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.patch('/change-password', requireAuth, changePassword);
router.patch('/notification-preferences', requireAuth, updateNotificationPreferences);

export default router;
