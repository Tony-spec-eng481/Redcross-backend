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
router.patch('/members/:id/accept', ctrl.acceptMember);
router.patch('/members/:id/approve', ctrl.approveMember);
router.patch('/members/:id/reject', ctrl.rejectMember);
router.patch('/members/:id/activate', ctrl.activateMember);
router.patch('/members/:id/deactivate', ctrl.deactivateMember);
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
router.patch('/gallery/:id', ctrl.updateGalleryItem);
router.patch('/gallery/:id/approve', ctrl.approveGalleryItem);
router.patch('/gallery/:id/reject', ctrl.rejectGalleryItem);
router.patch('/gallery/:id/favourite', ctrl.toggleGalleryFavourite);
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

// ── Leaders ──
router.get('/leaders', ctrl.getLeaders);
router.get('/leaders/:id', ctrl.getLeader);
router.post('/leaders', ctrl.createLeader);
router.patch('/leaders/:id', ctrl.updateLeader);
router.delete('/leaders/:id', ctrl.deleteLeader);

// ── Hero Slides ──
router.get('/hero', ctrl.getHeroSlides);
router.get('/hero/:id', ctrl.getHeroSlide);
router.post('/hero', ctrl.createHeroSlide);
router.patch('/hero/:id', ctrl.updateHeroSlide);
router.delete('/hero/:id', ctrl.deleteHeroSlide);

export default router;


