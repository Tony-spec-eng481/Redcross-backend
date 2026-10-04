import express from 'express';
import { upload } from '../middlewares/upload.js';
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/uploadController.js';

const router = express.Router();

// Single file upload (field name: 'file' or 'image' or 'media' or 'document')
router.post('/', upload.single('file'), uploadSingleFile);
router.post('/single', upload.single('file'), uploadSingleFile);

// Multiple files upload (field name: 'files', max 10)
router.post('/multiple', upload.array('files', 10), uploadMultipleFiles);

export default router;
