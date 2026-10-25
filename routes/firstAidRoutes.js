import express from 'express';
import {
  getFirstAid,
  getSingleFirstAid,
  submitFirstAid,
  getMySubmissions,
  getQuestions,
  getQuestionDetails,
  askQuestion,
  answerQuestion,
  voteQuestion,
  voteAnswer,
  acceptAnswer,
} from '../controllers/firstAidController.js';

const router = express.Router();

// Specific routes first
router.get('/', getFirstAid);
router.get('/my/:emailOrId', getMySubmissions);
router.post('/submit', submitFirstAid);
router.post('/', submitFirstAid);

// Community Q&A (Reddit / Stack Overflow style)
router.get('/questions/all', getQuestions);
router.get('/questions', getQuestions);
router.get('/questions/:id', getQuestionDetails);
router.post('/questions', askQuestion);
router.post('/questions/:id/answers', answerQuestion);
router.post('/questions/:id/vote', voteQuestion);
router.post('/answers/:id/vote', voteAnswer);
router.patch('/answers/:id/accept', acceptAnswer);

// Generic parameterized route at the end
router.get('/:id', getSingleFirstAid);

export default router;
