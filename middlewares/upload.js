import multer from 'multer';

// Allowed MIME types for uploads (Images, Videos, Documents)
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Configure in-memory storage so buffers are streamed to Supabase Storage
const storage = multer.memoryStorage();

// File filter for MIME type validation
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Supported formats include JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV.`), false);
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 20 * 1024 * 1024; // 20MB default

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSize },
});
