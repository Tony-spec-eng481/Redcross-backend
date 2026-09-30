import express from 'express';
import { getEvents } from '../controllers/eventController.js';
const router = express.Router();

router.get('/', getEvents);

export default router;
