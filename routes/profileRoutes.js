import express from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.use(requireAuth);
router.get('/', getProfile);
router.put('/', updateProfile);
router.delete('/', deleteProfile);

export default router;
