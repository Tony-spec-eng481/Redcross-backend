import express from 'express';
import { getFirstAid, askQuestion } from '../controllers/firstAidController.js';
const router = express.Router();

router.get('/', getFirstAid);
router.post('/questions', askQuestion);

export default router;
