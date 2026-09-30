import express from 'express';
import { getGallery, submitImage } from '../controllers/galleryController.js';
const router = express.Router();

router.get('/', getGallery);
router.post('/', submitImage);

export default router;
