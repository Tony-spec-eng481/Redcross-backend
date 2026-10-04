import express from 'express';
import {
  getMessages,
  sendMessage,
  submitContactForm,
  getDirectoryUsers,
} from '../controllers/messageController.js';

const router = express.Router();

// Directory of members & admins for user picker
router.get('/users', getDirectoryUsers);

// Public contact form endpoint
router.post('/contact', submitContactForm);

// General message endpoints
router.get('/', getMessages);
router.get('/:userId', getMessages);
router.post('/', sendMessage);

export default router;
