import express from 'express';
import {
  getEvents,
  getMyEvents,
  submitEvent,
  updateMemberEvent,
  deleteMemberEvent
} from '../controllers/eventController.js';

const router = express.Router();

// Public & portal routes
router.get('/', getEvents);
router.get('/my', getMyEvents);
router.post('/', submitEvent);
router.patch('/:id', updateMemberEvent);
router.delete('/:id', deleteMemberEvent);

export default router;
