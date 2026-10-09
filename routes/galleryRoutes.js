import express from 'express';
import {
  getPublicGallery,
  getMemberGallery,
  getMyGallery,
  submitGalleryItem,
  submitMultipleGalleryItems,
  updateMemberGalleryItem,
  deleteMemberGalleryItem
} from '../controllers/galleryController.js';

const router = express.Router();

// Public frontend — only approved + favourited items
router.get('/', getPublicGallery);

// Member portal routes
router.get('/member/:memberId', getMemberGallery);
router.get('/my/:memberId', getMyGallery);
router.post('/submit', submitGalleryItem);
router.post('/submit-multiple', submitMultipleGalleryItems);
router.patch('/member/:id', updateMemberGalleryItem);
router.delete('/member/:id', deleteMemberGalleryItem);

export default router;
