import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import * as ctrl from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

// ── Dashboard ──
router.get('/stats', ctrl.getStats);
router.get('/activity', ctrl.getActivity);

// ── Members ──
router.get('/members', ctrl.getMembers);
router.get('/members/:id', ctrl.getMember);
router.post('/members', ctrl.createMember);
router.patch('/members/:id', ctrl.updateMember);
router.patch('/members/:id/status', ctrl.updateMemberStatus);
router.delete('/members/:id', ctrl.deleteMember);

// ── Events ──
router.get('/events', ctrl.getEvents);
router.get('/events/:id', ctrl.getEvent);
router.post('/events', ctrl.createEvent);
router.patch('/events/:id', ctrl.updateEvent);
router.patch('/events/:id/approve', ctrl.approveEvent);
router.patch('/events/:id/reject', ctrl.rejectEvent);
router.delete('/events/:id', ctrl.deleteEvent);

// ── Gallery ──
router.get('/gallery', ctrl.getGallery);
router.post('/gallery', ctrl.createGalleryItem);
router.patch('/gallery/:id/approve', ctrl.approveGalleryItem);
router.patch('/gallery/:id/reject', ctrl.rejectGalleryItem);
router.delete('/gallery/:id', ctrl.deleteGalleryItem);

// ── First Aid ──
router.get('/firstaid', ctrl.getFirstAid);
router.get('/firstaid/:id', ctrl.getFirstAidItem);
router.post('/firstaid', ctrl.createFirstAid);
router.patch('/firstaid/:id', ctrl.updateFirstAid);
router.delete('/firstaid/:id', ctrl.deleteFirstAid);

// ── Messages ──
router.get('/messages', ctrl.getMessages);
router.post('/messages', ctrl.sendMessage);
router.patch('/messages/:id/read', ctrl.markMessageRead);
router.delete('/messages/:id', ctrl.deleteMessage);

// ── Questions ──
router.get('/questions', ctrl.getQuestions);
router.get('/questions/:id', ctrl.getQuestion);
router.post('/questions', ctrl.createQuestion);
router.patch('/questions/:id/answer', ctrl.answerQuestion);
router.delete('/questions/:id', ctrl.deleteQuestion);

// ── Notifications ──
router.get('/notifications', ctrl.getNotifications);
router.get('/notifications/unread-count', ctrl.getUnreadCount);
router.patch('/notifications/:id/read', ctrl.markNotificationRead);
router.patch('/notifications/read-all', ctrl.markAllNotificationsRead);
router.delete('/notifications/:id', ctrl.deleteNotification);

export default router;
