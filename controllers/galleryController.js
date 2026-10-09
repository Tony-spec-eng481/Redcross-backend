import { supabase } from '../config/supabase.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

// Helper to format gallery item with both url and image_url
const formatGallery = (item) => {
  if (!item) return item;
  return {
    ...item,
    url: item.image_url || item.url,
  };
};

// ═══════════════════════════════════════════════════════════
// PUBLIC / FRONTEND – Only approved + favourited items
// ═══════════════════════════════════════════════════════════

export const getPublicGallery = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('gallery')
    .select('id, title, image_url, category, description, type, is_favourite, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch gallery: ' + error.message, 500);

  const raw = data || [];
  const favourited = raw.filter(i => i.is_favourite);
  const result = favourited.length > 0 ? favourited : raw;

  const formatted = result.map(formatGallery);
  res.json(formatted);
});

// ═══════════════════════════════════════════════════════════
// MEMBER PORTAL – Submit, edit, delete own images + view approved
// ═══════════════════════════════════════════════════════════

// GET /api/v1/gallery/member/:memberId – Get all approved gallery items
export const getMemberGallery = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch gallery: ' + error.message, 500);
  return sendSuccess(res, 'Gallery fetched.', (data || []).map(formatGallery));
});

// GET /api/v1/gallery/my/:memberId – Get member's own submissions
export const getMyGallery = asyncHandler(async (req, res) => {
  const memberId = req.params.memberId;
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('submitted_by_member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch your gallery: ' + error.message, 500);
  return sendSuccess(res, 'Your gallery fetched.', (data || []).map(formatGallery));
});

// POST /api/v1/gallery/submit – Member submits a new gallery item (pending approval)
export const submitGalleryItem = asyncHandler(async (req, res) => {
  const { title, url, image_url, category, description, member_id, member_name, member_email, items } = req.body;

  // Support array of items submitted in single request
  if (Array.isArray(items) && items.length > 0) {
    const records = items.map((it, idx) => ({
      title: it.title || (title ? `${title} (${idx + 1})` : `Photo ${idx + 1}`),
      image_url: it.image_url || it.url,
      category: it.category || category || 'General',
      description: it.description || description || '',
      type: 'image',
      status: 'pending',
      submitted_by_member_id: member_id || it.member_id || null,
      submitted_by_name: member_name || it.member_name || '',
      submitted_by_email: member_email || it.member_email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })).filter(r => !!r.image_url);

    if (!records.length) return sendError(res, 'No valid image URLs provided.', 400);

    const { data, error } = await supabase
      .from('gallery')
      .insert(records)
      .select();

    if (error) return sendError(res, 'Failed to submit gallery items: ' + error.message, 400);
    return sendSuccess(res, `${records.length} photo(s) submitted for admin review.`, (data || []).map(formatGallery), 201);
  }

  const img = image_url || url;
  if (!img) return sendError(res, 'Image URL is required.', 400);

  const item = {
    title: title || 'Submitted Photo',
    image_url: img,
    category: category || 'General',
    description: description || '',
    type: 'image',
    status: 'pending',
    submitted_by_member_id: member_id || null,
    submitted_by_name: member_name || '',
    submitted_by_email: member_email || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('gallery')
    .insert([item])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to submit gallery item: ' + error.message, 400);
  return sendSuccess(res, 'Image submitted for admin review.', formatGallery(data), 201);
});

// POST /api/v1/gallery/submit-multiple – Explicit endpoint for multiple items
export const submitMultipleGalleryItems = asyncHandler(async (req, res) => {
  const { items, member_id, member_name, member_email, category, description } = req.body;
  const itemsToInsert = Array.isArray(items) ? items : [req.body];

  if (!itemsToInsert.length) {
    return sendError(res, 'No items provided for submission.', 400);
  }

  const records = itemsToInsert.map((item, index) => {
    const img = item.image_url || item.url;
    return {
      title: item.title || `Photo ${index + 1}`,
      image_url: img,
      category: item.category || category || 'General',
      description: item.description || description || '',
      type: 'image',
      status: 'pending',
      submitted_by_member_id: member_id || item.member_id || null,
      submitted_by_name: member_name || item.member_name || '',
      submitted_by_email: member_email || item.member_email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }).filter(r => !!r.image_url);

  if (!records.length) {
    return sendError(res, 'Image URLs are required for all items.', 400);
  }

  const { data, error } = await supabase
    .from('gallery')
    .insert(records)
    .select();

  if (error) return sendError(res, 'Failed to submit gallery items: ' + error.message, 400);
  return sendSuccess(res, `${records.length} photo(s) submitted successfully for admin review.`, (data || []).map(formatGallery), 201);
});

// PATCH /api/v1/gallery/member/:id – Member edits their own gallery item
export const updateMemberGalleryItem = asyncHandler(async (req, res) => {
  const { title, category, description, image_url, url, member_id } = req.body;

  // Verify this item belongs to the member
  const { data: existing, error: fetchErr } = await supabase
    .from('gallery')
    .select('submitted_by_member_id')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !existing) return sendError(res, 'Gallery item not found.', 404);
  if (String(existing.submitted_by_member_id) !== String(member_id)) {
    return sendError(res, 'You can only edit your own gallery items.', 403);
  }

  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (image_url || url) updates.image_url = image_url || url;
  // Re-set status to pending when edited, requiring re-approval
  updates.status = 'pending';

  const { data, error } = await supabase
    .from('gallery')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to update gallery item.', 400);
  return sendSuccess(res, 'Gallery item updated and sent for re-approval.', formatGallery(data));
});

// DELETE /api/v1/gallery/member/:id – Member deletes their own gallery item
export const deleteMemberGalleryItem = asyncHandler(async (req, res) => {
  const { member_id } = req.body;

  // Verify this item belongs to the member
  const { data: existing, error: fetchErr } = await supabase
    .from('gallery')
    .select('submitted_by_member_id')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !existing) return sendError(res, 'Gallery item not found.', 404);
  if (String(existing.submitted_by_member_id) !== String(member_id)) {
    return sendError(res, 'You can only delete your own gallery items.', 403);
  }

  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete gallery item: ' + error.message, 500);
  return sendSuccess(res, 'Gallery item deleted.');
});
