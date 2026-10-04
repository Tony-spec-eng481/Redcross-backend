import path from 'path';
import crypto from 'crypto';
import { supabase } from '../../config/supabase.js';

export const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'Store';

/**
 * Determine folder category based on mimetype
 */
export const getFolderByMimeType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (
    mimetype.includes('pdf') ||
    mimetype.includes('word') ||
    mimetype.includes('document') ||
    mimetype.includes('sheet') ||
    mimetype.includes('text')
  ) {
    return 'documents';
  }
  return 'general';
};

/**
 * Upload a file buffer directly to the Supabase storage bucket
 * @param {Buffer} fileBuffer - The buffer of the file
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File mimetype
 * @param {string} customFolder - Optional custom folder name
 * @returns {Promise<{ url: string, path: string, bucket: string }>}
 */
export const uploadToSupabase = async (fileBuffer, originalName, mimeType, customFolder = null) => {
  const folder = customFolder || getFolderByMimeType(mimeType);
  const ext = path.extname(originalName) || '';
  const randomStr = crypto.randomBytes(8).toString('hex');
  const sanitizedBase = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const fileName = `${Date.now()}-${randomStr}-${sanitizedBase}${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl,
    path: filePath,
    bucket: STORAGE_BUCKET,
    fileName,
  };
};

/**
 * Delete a file from the Supabase storage bucket by its path or public URL
 * @param {string} filePathOrUrl
 */
export const deleteFromSupabase = async (filePathOrUrl) => {
  if (!filePathOrUrl) return;

  let filePath = filePathOrUrl;
  // If a full public URL is passed, extract the relative path in the bucket
  if (filePathOrUrl.includes(STORAGE_BUCKET)) {
    const parts = filePathOrUrl.split(`${STORAGE_BUCKET}/`);
    if (parts.length > 1) {
      filePath = parts[1];
    }
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error(`Failed to delete from Supabase storage: ${error.message}`);
  }
  return data;
};
