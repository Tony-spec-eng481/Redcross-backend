import express from 'express';
import { upload } from '../middlewares/upload.js';
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/uploadController.js';

const router = express.Router();

// Single file upload (accepts any field name: 'file', 'image', 'files', etc.)
router.post('/', upload.any(), uploadSingleFile);
router.post('/single', upload.any(), uploadSingleFile);

// Multiple files upload (accepts any field names: 'files', 'file', 'images', etc.)
router.post('/multiple', upload.any(), uploadMultipleFiles);

export default router;
