import { uploadToSupabase } from '../src/utils/storage.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

/**
 * POST /api/v1/upload
 * Upload a single file to Supabase storage bucket
 */
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded.', 400);
  }

  const { buffer, originalname, mimetype, size } = req.file;
  const folder = req.body.folder || null;

  try {
    const result = await uploadToSupabase(buffer, originalname, mimetype, folder);

    return sendSuccess(
      res,
      'File uploaded successfully to Supabase storage.',
      {
        url: result.url,
        path: result.path,
        bucket: result.bucket,
        fileName: result.fileName,
        originalname,
        mimetype,
        size,
      },
      201
    );
  } catch (error) {
    return sendError(res, `Upload failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/v1/upload/multiple
 * Upload multiple files to Supabase storage bucket
 */
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No files uploaded.', 400);
  }

  const folder = req.body.folder || null;
  const results = [];

  for (const file of req.files) {
    const { buffer, originalname, mimetype, size } = file;
    const result = await uploadToSupabase(buffer, originalname, mimetype, folder);
    results.push({
      url: result.url,
      path: result.path,
      bucket: result.bucket,
      fileName: result.fileName,
      originalname,
      mimetype,
      size,
    });
  }

  return sendSuccess(
    res,
    `${results.length} file(s) uploaded successfully to Supabase storage.`,
    results,
    201
  );
});
