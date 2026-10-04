import { supabase } from '../config/supabase.js';
import { sendSuccess, sendError } from '../src/utils/response.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { sendDirectMessageEmail, sendBroadcastEmail } from '../src/services/emailService.js';

// Helper to format gallery item with both url and image_url
const formatGallery = (item) => {
  if (!item) return item;
  return {
    ...item,
    url: item.image_url || item.url,
  };
};

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// STATS / DASHBOARD
// ═══════════════════════════════════════════════════════════

export const getStats = asyncHandler(async (req, res) => {
  const [members, admins, events, pendingGallery, messages, pendingEvents, questions] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('admins').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('gallery').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'unanswered'),
  ]);

  return sendSuccess(res, 'Dashboard stats fetched.', {
    totalMembers: (members.count || 0) + (admins.count || 0),
    activeEvents: events.count || 0,
    pendingImages: pendingGallery.count || 0,
    totalMessages: messages.count || 0,
    pendingEvents: pendingEvents.count || 0,
    unansweredQuestions: questions.count || 0,
  });
});

export const getActivity = asyncHandler(async (req, res) => {
  const [{ data: recentEvents }, { data: recentMembers }] = await Promise.all([
    supabase.from('events').select('title, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('members').select('name, role, joined, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const activity = [
    ...(recentEvents || []).map((e) => ({
      type: 'event',
      text: `Event "${e.title}" ${e.status}`,
      time: e.created_at,
    })),
    ...(recentMembers || []).map((m) => ({
      type: 'member',
      text: `${m.name} joined as ${m.role || 'Member'}`,
      time: m.joined || m.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  return sendSuccess(res, 'Activity feed fetched.', activity);
});

// ═══════════════════════════════════════════════════════════
// MEMBERS (Includes Registered Administrators)
// ═══════════════════════════════════════════════════════════

const isAdminTarget = (id) => typeof id === 'string' && (id.startsWith('admin_') || id.includes('-'));
const extractAdminId = (id) => (typeof id === 'string' && id.startsWith('admin_') ? id.replace('admin_', '') : id);

export const getMembers = asyncHandler(async (req, res) => {
  const { search, status, role, sort = 'newest', include_admins = 'true' } = req.query;

  // 1. Query Members Table
  let memberQuery = supabase.from('members').select('*');

  if (search) {
    const q = search.trim();
    memberQuery = memberQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  if (status && status !== 'all') {
    memberQuery = memberQuery.eq('status', status.toLowerCase());
  }

  const isRoleAdmin = role === 'Admin' || role === 'Super Admin' || role === 'admin' || role === 'superadmin';

  if (role && role !== 'all') {
    if (isRoleAdmin) {
      // If filtering specifically for Admin, skip regular members
      memberQuery = memberQuery.eq('role', 'NON_EXISTENT_ROLE');
    } else {
      memberQuery = memberQuery.eq('role', role);
    }
  }

  // 2. Query Admins Table (Admins are also members of the chapter)
  let adminPromise = Promise.resolve({ data: [] });
  if (include_admins !== 'false' && (!role || role === 'all' || isRoleAdmin)) {
    let adminQuery = supabase.from('admins').select('id, name, email, phone, role, avatar, is_active, last_login, created_at, updated_at');

    if (search) {
      const q = search.trim();
      adminQuery = adminQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    if (status && status !== 'all') {
      const s = status.toLowerCase();
      if (s === 'active' || s === 'approved') {
        adminQuery = adminQuery.eq('is_active', true);
      } else if (s === 'inactive') {
        adminQuery = adminQuery.eq('is_active', false);
      } else {
        // Admins cannot be 'pending' or 'rejected'
        adminQuery = null;
      }
    }

    if (adminQuery && role && role !== 'all') {
      if (role === 'Super Admin' || role === 'superadmin') {
        adminQuery = adminQuery.eq('role', 'superadmin');
      } else if (role === 'Admin' || role === 'admin') {
        adminQuery = adminQuery.eq('role', 'admin');
      }
    }

    if (adminQuery) {
      adminPromise = adminQuery;
    }
  }

  const [{ data: membersData, error: memError }, { data: adminsData, error: adminError }] = await Promise.all([
    memberQuery,
    adminPromise,
  ]);

  if (memError) return sendError(res, 'Failed to fetch members: ' + memError.message, 500);

  // Format admins to member shape
  const formattedAdmins = (adminsData || []).map((admin) => ({
    id: `admin_${admin.id}`,
    raw_id: admin.id,
    is_admin: true,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || '',
    role: admin.role === 'superadmin' ? 'Super Admin' : 'Admin',
    status: admin.is_active ? 'active' : 'inactive',
    avatar: admin.avatar || null,
    joined: admin.created_at,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    notes: admin.last_login ? `Registered Administrator (Last active: ${new Date(admin.last_login).toLocaleDateString()})` : 'Registered Administrator',
  }));

  // Prevent duplication if admin email exists in both tables
  const adminEmails = new Set(formattedAdmins.map((a) => a.email.toLowerCase()));
  const regularMembers = (membersData || []).filter((m) => !adminEmails.has(m.email.toLowerCase()));

  let combined = [...formattedAdmins, ...regularMembers];

  // Sorting
  switch (sort) {
    case 'oldest':
      combined.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      break;
    case 'name_asc':
      combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'name_desc':
      combined.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'newest':
    default:
      combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      break;
  }

  return sendSuccess(res, 'Members and registered admins fetched.', combined);
});

export const getMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, name, email, phone, role, avatar, is_active, last_login, created_at, updated_at')
      .eq('id', rawId)
      .single();

    if (error || !admin) return sendError(res, 'Administrator record not found.', 404);

    const formatted = {
      id: `admin_${admin.id}`,
      raw_id: admin.id,
      is_admin: true,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role === 'superadmin' ? 'Super Admin' : 'Admin',
      status: admin.is_active ? 'active' : 'inactive',
      avatar: admin.avatar || null,
      joined: admin.created_at,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
      notes: admin.last_login ? `Registered Administrator (Last active: ${new Date(admin.last_login).toLocaleDateString()})` : 'Registered Administrator',
    };
    return sendSuccess(res, 'Member fetched.', formatted);
  }

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return sendError(res, 'Member not found.', 404);
  return sendSuccess(res, 'Member fetched.', data);
});

export const createMember = asyncHandler(async (req, res) => {
  const { name, email, phone, role, status, notes, avatar, joined } = req.body;
  if (!name || !email) return sendError(res, 'Name and email are required.', 400);

  const newMember = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ? phone.trim() : '',
    role: role || 'Member',
    status: status || 'active',
    notes: notes ? notes.trim() : '',
    avatar: avatar || null,
    joined: joined || new Date().toISOString(),
    created_by: req.admin?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('members')
    .insert([newMember])
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.message.includes('unique')) {
      return sendError(res, 'A member with this email already exists.', 400);
    }
    return sendError(res, 'Failed to create member: ' + error.message, 400);
  }

  return sendSuccess(res, 'Member created successfully.', data, 201);
});

export const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);
    const adminUpdates = { updated_at: new Date().toISOString() };

    if (req.body.name) adminUpdates.name = req.body.name.trim();
    if (req.body.email) adminUpdates.email = req.body.email.toLowerCase().trim();
    if (req.body.phone !== undefined) adminUpdates.phone = req.body.phone ? req.body.phone.trim() : '';
    if (req.body.avatar !== undefined) adminUpdates.avatar = req.body.avatar;
    if (req.body.status !== undefined) adminUpdates.is_active = req.body.status === 'active' || req.body.status === 'approved';
    if (req.body.role) {
      if (req.body.role === 'Super Admin' || req.body.role === 'superadmin') adminUpdates.role = 'superadmin';
      else if (req.body.role === 'Admin' || req.body.role === 'admin') adminUpdates.role = 'admin';
    }

    const { data: updatedAdmin, error } = await supabase
      .from('admins')
      .update(adminUpdates)
      .eq('id', rawId)
      .select('id, name, email, phone, role, avatar, is_active, last_login, created_at, updated_at')
      .single();

    if (error || !updatedAdmin) return sendError(res, error ? error.message : 'Failed to update admin account.', 400);

    return sendSuccess(res, 'Administrator member details updated successfully.', {
      id: `admin_${updatedAdmin.id}`,
      raw_id: updatedAdmin.id,
      is_admin: true,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      phone: updatedAdmin.phone || '',
      role: updatedAdmin.role === 'superadmin' ? 'Super Admin' : 'Admin',
      status: updatedAdmin.is_active ? 'active' : 'inactive',
      avatar: updatedAdmin.avatar,
      joined: updatedAdmin.created_at,
    });
  }

  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  delete updates.id;

  if (updates.email) {
    updates.email = updates.email.toLowerCase().trim();
  }
  if (updates.name) {
    updates.name = updates.name.trim();
  }

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, error ? error.message : 'Failed to update member or member not found.', 400);
  return sendSuccess(res, 'Member updated successfully.', data);
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let newStatus = req.body.status;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);
    if (!newStatus) {
      const { data: admin } = await supabase.from('admins').select('is_active').eq('id', rawId).single();
      if (!admin) return sendError(res, 'Administrator not found.', 404);
      newStatus = admin.is_active ? 'inactive' : 'active';
    }

    const isActive = newStatus.toLowerCase() === 'active' || newStatus.toLowerCase() === 'approved';
    const { data: updatedAdmin, error } = await supabase
      .from('admins')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', rawId)
      .select()
      .single();

    if (error || !updatedAdmin) return sendError(res, 'Failed to update admin status.', 400);
    return sendSuccess(res, `Administrator status changed to ${newStatus}.`, {
      id: `admin_${updatedAdmin.id}`,
      status: isActive ? 'active' : 'inactive',
    });
  }

  if (!newStatus) {
    const { data: member } = await supabase.from('members').select('status').eq('id', id).single();
    if (!member) return sendError(res, 'Member not found.', 404);
    newStatus = member.status === 'active' ? 'inactive' : 'active';
  }

  const { data, error } = await supabase
    .from('members')
    .update({ status: newStatus.toLowerCase(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to update member status.', 400);
  return sendSuccess(res, `Member status changed to ${newStatus}.`, data);
});

export const acceptMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body || {};

  if (isAdminTarget(id)) {
    return sendSuccess(res, 'Administrator is already an active member of the chapter.');
  }

  const updateData = {
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  if (notes) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to accept member application.', 400);
  return sendSuccess(res, 'Member application accepted and activated.', data);
});

export const approveMember = acceptMember;

export const rejectMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, notes } = req.body || {};
  const rejectionNote = reason || notes;

  if (isAdminTarget(id)) {
    return sendError(res, 'Cannot reject a registered chapter administrator.', 400);
  }

  const updateData = {
    status: 'rejected',
    updated_at: new Date().toISOString(),
  };
  if (rejectionNote) {
    updateData.notes = rejectionNote;
  }

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to reject member application.', 400);
  return sendSuccess(res, 'Member application rejected.', data);
});

export const deactivateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);
    const { data, error } = await supabase
      .from('admins')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', rawId)
      .select()
      .single();

    if (error || !data) return sendError(res, 'Failed to deactivate admin.', 400);
    return sendSuccess(res, 'Administrator deactivated successfully.', { id: `admin_${data.id}`, status: 'inactive' });
  }

  const { data, error } = await supabase
    .from('members')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to deactivate member.', 400);
  return sendSuccess(res, 'Member deactivated successfully.', data);
});

export const activateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);
    const { data, error } = await supabase
      .from('admins')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', rawId)
      .select()
      .single();

    if (error || !data) return sendError(res, 'Failed to activate admin.', 400);
    return sendSuccess(res, 'Administrator activated successfully.', { id: `admin_${data.id}`, status: 'active' });
  }

  const { data, error } = await supabase
    .from('members')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to activate member.', 400);
  return sendSuccess(res, 'Member activated successfully.', data);
});

export const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isAdminTarget(id)) {
    const rawId = extractAdminId(id);

    if (req.admin?.id === rawId) {
      return sendError(res, 'You cannot delete your own active administrator account.', 400);
    }

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', rawId);

    if (error) return sendError(res, 'Failed to delete admin: ' + error.message, 500);
    return sendSuccess(res, 'Administrator record deleted successfully.');
  }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) return sendError(res, 'Failed to delete member: ' + error.message, 500);
  return sendSuccess(res, 'Member deleted successfully.');
});

// ═══════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════

export const getEvents = asyncHandler(async (req, res) => {
  const { search, status, sort = 'newest' } = req.query;

  let query = supabase.from('events').select('*');

  if (search && search.trim()) {
    const q = search.trim();
    query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,submitted_by_name.ilike.%${q}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase());
  }

  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (sort === 'date_asc') {
    query = query.order('date', { ascending: true, nullsFirst: false });
  } else if (sort === 'date_desc') {
    query = query.order('date', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch events: ' + error.message, 500);
  return sendSuccess(res, 'Events fetched.', data || []);
});

export const getEvent = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return sendError(res, 'Event not found.', 404);
  return sendSuccess(res, 'Event fetched.', data);
});

export const createEvent = asyncHandler(async (req, res) => {
  const { title, date, time, location, description, image_url, category, status } = req.body;
  if (!title || !title.trim()) return sendError(res, 'Event title is required.', 400);

  const initialStatus = status || 'approved';
  const newEvent = {
    title: title.trim(),
    date: date || null,
    time: time || null,
    location: location?.trim() || '',
    description: description?.trim() || '',
    image_url: image_url?.trim() || '',
    category: category?.trim() || 'General',
    status: initialStatus,
    submitted_by_name: req.admin?.name || 'Administrator',
    submitted_by_email: req.admin?.email || 'admin@kirinyaga.ac.ke',
    submitted_by: req.admin?.id || null,
    approved_by: initialStatus === 'approved' ? (req.admin?.id || null) : null,
    approved_at: initialStatus === 'approved' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('events')
    .insert([newEvent])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to create event: ' + error.message, 400);
  return sendSuccess(res, 'Event created successfully.', data, 201);
});

export const updateEvent = asyncHandler(async (req, res) => {
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  delete updates.id;

  if (updates.status === 'approved' && !updates.approved_at) {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = req.admin?.id || null;
    updates.rejection_reason = null;
  }

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to update event or event not found.', 404);
  return sendSuccess(res, 'Event updated successfully.', data);
});

export const approveEvent = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'approved',
      approved_by: req.admin?.id || null,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to approve event: ' + (error?.message || ''), 400);
  return sendSuccess(res, 'Event approved and published to website.', data);
});

export const rejectEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'rejected',
      rejection_reason: reason || 'Not approved by admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to reject event: ' + (error?.message || ''), 400);
  return sendSuccess(res, 'Event rejected.', data);
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete event: ' + error.message, 500);
  return sendSuccess(res, 'Event deleted successfully.');
});

// ═══════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════

export const getGallery = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch gallery items: ' + error.message, 500);
  const formatted = (data || []).map(formatGallery);
  return sendSuccess(res, 'Gallery fetched.', formatted);
});

export const createGalleryItem = asyncHandler(async (req, res) => {
  const { title, url, image_url, type, category, description, is_favourite } = req.body;
  const img = image_url || url;
  if (!img) return sendError(res, 'Image URL is required.', 400);

  const item = {
    title: title || 'New Photo',
    image_url: img,
    type: type || 'image',
    category: category || 'General',
    description: description || '',
    status: 'approved',
    is_favourite: is_favourite || false,
    submitted_by: req.admin?.id || null,
    approved_by: req.admin?.id || null,
    submitted_by_name: 'Admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('gallery')
    .insert([item])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to create gallery item: ' + error.message, 400);
  return sendSuccess(res, 'Gallery item uploaded.', formatGallery(data), 201);
});

export const updateGalleryItem = asyncHandler(async (req, res) => {
  const { title, image_url, url, type, category, description, is_favourite } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (image_url || url) updates.image_url = image_url || url;
  if (type !== undefined) updates.type = type;
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (is_favourite !== undefined) updates.is_favourite = is_favourite;

  const { data, error } = await supabase
    .from('gallery')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to update gallery item.', 400);
  return sendSuccess(res, 'Gallery item updated.', formatGallery(data));
});

export const toggleGalleryFavourite = asyncHandler(async (req, res) => {
  // Fetch current favourite status
  const { data: current, error: fetchErr } = await supabase
    .from('gallery')
    .select('is_favourite')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !current) return sendError(res, 'Gallery item not found.', 404);

  const { data, error } = await supabase
    .from('gallery')
    .update({
      is_favourite: !current.is_favourite,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to toggle favourite.', 400);
  return sendSuccess(
    res,
    data.is_favourite ? 'Gallery item added to frontend.' : 'Gallery item removed from frontend.',
    formatGallery(data)
  );
});

export const approveGalleryItem = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('gallery')
    .update({
      status: 'approved',
      approved_by: req.admin?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to approve gallery item.', 400);
  return sendSuccess(res, 'Gallery item approved.', formatGallery(data));
});

export const rejectGalleryItem = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const { data, error } = await supabase
    .from('gallery')
    .update({
      status: 'rejected',
      rejection_reason: reason || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to reject gallery item.', 400);
  return sendSuccess(res, 'Gallery item rejected.', formatGallery(data));
});

export const deleteGalleryItem = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete gallery item: ' + error.message, 500);
  return sendSuccess(res, 'Gallery item deleted.');
});

// ═══════════════════════════════════════════════════════════
// FIRST AID
// ═══════════════════════════════════════════════════════════

export const getFirstAid = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('first_aid')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch first aid guides: ' + error.message, 500);
  return sendSuccess(res, 'First aid guides fetched.', data || []);
});

export const getFirstAidItem = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('first_aid')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return sendError(res, 'Guide not found.', 404);
  return sendSuccess(res, 'Guide fetched.', data);
});

export const createFirstAid = asyncHandler(async (req, res) => {
  const { title, content, category, video_url, image_url } = req.body;
  if (!title) return sendError(res, 'Title is required.', 400);

  const item = {
    title: title.trim(),
    content: content || '',
    category: category || 'General',
    video_url: video_url || '',
    image_url: image_url || '',
    is_published: true,
    created_by: req.admin?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('first_aid')
    .insert([item])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to create guide: ' + error.message, 400);
  return sendSuccess(res, 'First aid guide created.', data, 201);
});

export const updateFirstAid = asyncHandler(async (req, res) => {
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  delete updates.id;

  const { data, error } = await supabase
    .from('first_aid')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Failed to update guide or guide not found.', 404);
  return sendSuccess(res, 'Guide updated.', data);
});

export const deleteFirstAid = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('first_aid')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete guide: ' + error.message, 500);
  return sendSuccess(res, 'Guide deleted.');
});

// ═══════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════

export const getMessages = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch messages: ' + error.message, 500);
  return sendSuccess(res, 'Messages fetched.', data || []);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const {
    text,
    subject,
    is_broadcast,
    receiver_id,
    receiver_name,
    receiver_email,
    reply_to_id,
  } = req.body;

  if (!text || !text.trim()) return sendError(res, 'Message text is required.', 400);

  const isBroadcast = is_broadcast === true || is_broadcast === 'true';
  const adminName = req.admin?.name || 'Admin';
  const adminEmail = req.admin?.email || 'waruijohnkar@gmail.com';

  let targetReceiverEmail = receiver_email;
  let targetReceiverName = receiver_name;

  if (reply_to_id && !targetReceiverEmail) {
    try {
      const { data: origMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('id', reply_to_id)
        .single();

      if (origMsg) {
        const match = (origMsg.sender_name || origMsg.text || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        targetReceiverEmail = origMsg.sender_email || (match ? match[0] : null);
        targetReceiverName = targetReceiverName || origMsg.sender_name?.replace(/\([^)]*\)/g, '').trim();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const message = {
    sender_id: req.admin?.id || null,
    sender_name: adminName,
    sender_email: adminEmail,
    receiver_id: receiver_id || null,
    receiver_name: targetReceiverName || null,
    receiver_email: targetReceiverEmail || null,
    subject: subject || (reply_to_id ? 'Re: Message' : isBroadcast ? 'Broadcast Announcement' : 'Direct Message'),
    text: text.trim(),
    is_broadcast: isBroadcast,
    reply_to_id: reply_to_id || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('messages')
    .insert([message])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to send message: ' + error.message, 400);

  // Send Brevo email in background
  if (isBroadcast) {
    sendBroadcastEmail({
      subject: message.subject,
      message: message.text,
      senderName: adminName,
    }).catch(e => console.error('Admin broadcast email failed:', e));
  } else if (targetReceiverEmail) {
    sendDirectMessageEmail({
      toEmail: targetReceiverEmail,
      receiverName: targetReceiverName || 'Member',
      senderName: adminName,
      senderEmail: adminEmail,
      subject: message.subject,
      message: message.text,
      isToAdmin: false,
    }).catch(e => console.error('Admin direct email failed:', e));
  }

  return sendSuccess(res, 'Message sent and dispatched via email.', data, 201);
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Message not found.', 404);
  return sendSuccess(res, 'Message marked as read.', data);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete message: ' + error.message, 500);
  return sendSuccess(res, 'Message deleted.');
});

// ═══════════════════════════════════════════════════════════
// QUESTIONS
// ═══════════════════════════════════════════════════════════

export const getQuestions = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch questions: ' + error.message, 500);
  return sendSuccess(res, 'Questions fetched.', data || []);
});

export const getQuestion = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return sendError(res, 'Question not found.', 404);
  return sendSuccess(res, 'Question fetched.', data);
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { question, asked_by } = req.body;
  if (!question) return sendError(res, 'Question text is required.', 400);

  const q = {
    question: question.trim(),
    asked_by: asked_by || 'Member',
    status: 'unanswered',
    answer: null,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('questions')
    .insert([q])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to create question: ' + error.message, 400);
  return sendSuccess(res, 'Question submitted.', data, 201);
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  const { data, error } = await supabase
    .from('questions')
    .update({
      answer: answer || '',
      status: 'answered',
      answered_by: req.admin?.id || null,
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Question not found or update failed.', 404);
  return sendSuccess(res, 'Question answered.', data);
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete question: ' + error.message, 500);
  return sendSuccess(res, 'Question deleted.');
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export const getNotifications = asyncHandler(async (req, res) => {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

  if (req.admin?.id) {
    query = query.or(`recipient_id.eq.${req.admin.id},recipient_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return sendError(res, 'Failed to fetch notifications: ' + error.message, 500);
  return sendSuccess(res, 'Notifications fetched.', data || []);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (req.admin?.id) {
    query = query.or(`recipient_id.eq.${req.admin.id},recipient_id.is.null`);
  }

  const { count, error } = await query;
  if (error) return sendError(res, 'Failed to fetch unread count: ' + error.message, 500);
  return sendSuccess(res, 'Unread count fetched.', { count: count || 0 });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return sendError(res, 'Notification not found.', 404);
  return sendSuccess(res, 'Notification marked as read.', data);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  let query = supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false);

  if (req.admin?.id) {
    query = query.or(`recipient_id.eq.${req.admin.id},recipient_id.is.null`);
  }

  const { error } = await query;
  if (error) return sendError(res, 'Failed to mark all as read: ' + error.message, 500);
  return sendSuccess(res, 'All notifications marked as read.');
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', req.params.id);

  if (error) return sendError(res, 'Failed to delete notification: ' + error.message, 500);
  return sendSuccess(res, 'Notification deleted.');
});

// ═══════════════════════════════════════════════════════════
// LEADERS MANAGEMENT
// ═══════════════════════════════════════════════════════════
export const getLeaders = asyncHandler(async (req, res) => {
  const { search, status, sort } = req.query;

  let query = supabase.from('leaders').select('*');

  if (search) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,role.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase());
  }

  if (sort === 'name_asc') {
    query = query.order('name', { ascending: true });
  } else if (sort === 'name_desc') {
    query = query.order('name', { ascending: false });
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    // Default: ordered by sort_order ascending, then created_at ascending
    query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  }

  const { data, error } = await query;
  if (error) return sendError(res, 'Failed to fetch leaders: ' + error.message, 500);

  return sendSuccess(res, 'Leaders fetched successfully.', data || []);
});

export const getLeader = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('leaders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return sendError(res, 'Leader not found.', 404);
  return sendSuccess(res, 'Leader fetched.', data);
});

export const createLeader = asyncHandler(async (req, res) => {
  const { name, role, image, bio, email, phone, sort_order, status } = req.body;
  if (!name || !role) return sendError(res, 'Leader name and role are required.', 400);

  const newLeader = {
    name: name.trim(),
    role: role.trim(),
    image: image || null,
    bio: bio ? bio.trim() : null,
    email: email ? email.toLowerCase().trim() : null,
    phone: phone ? phone.trim() : null,
    sort_order: sort_order !== undefined && sort_order !== '' ? parseInt(sort_order, 10) : 0,
    status: status || 'active',
    created_by: req.admin?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('leaders')
    .insert([newLeader])
    .select()
    .single();

  if (error) return sendError(res, 'Failed to create leader: ' + error.message, 400);
  return sendSuccess(res, 'Leader created successfully.', data, 201);
});

export const updateLeader = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  if (updates.name) updates.name = updates.name.trim();
  if (updates.role) updates.role = updates.role.trim();
  if (updates.email) updates.email = updates.email.toLowerCase().trim();
  if (updates.sort_order !== undefined && updates.sort_order !== '') {
    updates.sort_order = parseInt(updates.sort_order, 10);
  }

  delete updates.id;
  delete updates.created_at;

  const { data, error } = await supabase
    .from('leaders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return sendError(res, error ? error.message : 'Leader not found.', 400);
  return sendSuccess(res, 'Leader updated successfully.', data);
});

export const deleteLeader = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('leaders')
    .delete()
    .eq('id', id);

  if (error) return sendError(res, 'Failed to delete leader: ' + error.message, 400);
  return sendSuccess(res, 'Leader deleted successfully.');
});

// ═══════════════════════════════════════════════════════════
// HERO SLIDES (Frontend Banner Management)
// ═══════════════════════════════════════════════════════════

let fallbackHeroSlides = [
  {
    id: 1,
    eyebrow: 'KIRINYAGA UNIVERSITY · RED CROSS CHAPTER',
    first: 'Ready to Help.',
    accent: 'Always.',
    description: 'Serving humanity through compassion, courage, and community care — right here on campus.',
    primary: 'Learn About Us',
    primary_button_text: 'Learn About Us',
    primaryHref: '/about',
    primary_href: '/about',
    secondary: 'Join the Chapter',
    secondary_button_text: 'Join the Chapter',
    secondaryHref: '/contact',
    secondary_href: '/contact',
    image: 'https://kyuchapter.netlify.app/1.jpeg',
    status: 'active',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    eyebrow: 'FIRST AID · BLOOD DRIVES · OUTREACH',
    first: 'Compassion in',
    accent: 'Every Action.',
    description: 'From first aid training to community outreach — we show up when it matters most.',
    primary: 'See Our Events',
    primary_button_text: 'See Our Events',
    primaryHref: '/events',
    primary_href: '/events',
    secondary: 'Volunteer With Us',
    secondary_button_text: 'Volunteer With Us',
    secondaryHref: '/contact',
    secondary_href: '/contact',
    image: 'https://kyuchapter.netlify.app/2.jpeg',
    status: 'active',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    eyebrow: 'HUMANITY · IMPARTIALITY · NEUTRALITY',
    first: 'One Chapter.',
    accent: 'Countless Lives.',
    description: 'United by the seven fundamental principles of the Red Cross Movement, we serve without boundaries.',
    primary: 'Our Mission',
    primary_button_text: 'Our Mission',
    primaryHref: '/about',
    primary_href: '/about',
    secondary: 'Meet the Team',
    secondary_button_text: 'Meet the Team',
    secondaryHref: '/team',
    secondary_href: '/team',
    image: 'https://kyuchapter.netlify.app/3.jpeg',
    status: 'active',
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
];

const normalizeHeroSlide = (s) => ({
  id: s.id,
  eyebrow: s.eyebrow || 'KIRINYAGA UNIVERSITY · RED CROSS CHAPTER',
  first: s.first || 'Ready to Help.',
  accent: s.accent || 'Always.',
  description: s.description || '',
  primary: s.primary_button_text || s.primary || 'Learn More',
  primary_button_text: s.primary_button_text || s.primary || 'Learn More',
  primaryHref: s.primary_href || s.primaryHref || '/about',
  primary_href: s.primary_href || s.primaryHref || '/about',
  secondary: s.secondary_button_text || s.secondary || 'Contact Us',
  secondary_button_text: s.secondary_button_text || s.secondary || 'Contact Us',
  secondaryHref: s.secondary_href || s.secondaryHref || '/contact',
  secondary_href: s.secondary_href || s.secondaryHref || '/contact',
  image: s.image || 'https://kyuchapter.netlify.app/1.jpeg',
  status: s.status || 'active',
  sort_order: s.sort_order !== undefined ? s.sort_order : 0,
  created_at: s.created_at || new Date().toISOString(),
});

export const getHeroSlides = asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return sendSuccess(res, 'Hero slides fetched from database.', data.map(normalizeHeroSlide));
    }
  } catch (err) {
    console.warn('Supabase hero_slides query fallback:', err.message);
  }

  // Fallback if table doesn't exist yet
  return sendSuccess(res, 'Hero slides fetched.', fallbackHeroSlides.map(normalizeHeroSlide));
});

export const getHeroSlide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return sendSuccess(res, 'Hero slide fetched.', normalizeHeroSlide(data));
    }
  } catch (err) {
    console.warn('Supabase getHeroSlide fallback:', err.message);
  }

  const slide = fallbackHeroSlides.find((s) => String(s.id) === String(id));
  if (!slide) return sendError(res, 'Hero slide not found.', 404);
  return sendSuccess(res, 'Hero slide fetched.', normalizeHeroSlide(slide));
});

export const createHeroSlide = asyncHandler(async (req, res) => {
  const {
    eyebrow,
    first,
    accent,
    description,
    primary,
    primary_button_text,
    primaryHref,
    primary_href,
    secondary,
    secondary_button_text,
    secondaryHref,
    secondary_href,
    image,
    status,
    sort_order,
  } = req.body;

  if (!first || !accent || !image) {
    return sendError(res, 'First title, accent title, and hero background image are required.', 400);
  }

  const newSlide = {
    eyebrow: (eyebrow || 'KIRINYAGA UNIVERSITY · RED CROSS CHAPTER').trim(),
    first: first.trim(),
    accent: accent.trim(),
    description: (description || '').trim(),
    primary_button_text: (primary_button_text || primary || 'Learn More').trim(),
    primary_href: (primary_href || primaryHref || '/about').trim(),
    secondary_button_text: (secondary_button_text || secondary || 'Contact Us').trim(),
    secondary_href: (secondary_href || secondaryHref || '/contact').trim(),
    image: image.trim(),
    status: status || 'active',
    sort_order: sort_order !== undefined && sort_order !== '' ? parseInt(sort_order, 10) : fallbackHeroSlides.length + 1,
    created_by: req.admin?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .insert([newSlide])
      .select()
      .single();

    if (!error && data) {
      const normalized = normalizeHeroSlide(data);
      fallbackHeroSlides.push(normalized);
      return sendSuccess(res, 'Hero slide created successfully.', normalized, 201);
    }
  } catch (err) {
    console.warn('Supabase createHeroSlide fallback:', err.message);
  }

  const fallbackId = Date.now();
  const created = normalizeHeroSlide({ id: fallbackId, ...newSlide });
  fallbackHeroSlides.push(created);
  return sendSuccess(res, 'Hero slide created successfully.', created, 201);
});

export const updateHeroSlide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (body.eyebrow !== undefined) updates.eyebrow = body.eyebrow.trim();
  if (body.first !== undefined) updates.first = body.first.trim();
  if (body.accent !== undefined) updates.accent = body.accent.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.primary_button_text !== undefined || body.primary !== undefined) {
    updates.primary_button_text = (body.primary_button_text || body.primary).trim();
  }
  if (body.primary_href !== undefined || body.primaryHref !== undefined) {
    updates.primary_href = (body.primary_href || body.primaryHref).trim();
  }
  if (body.secondary_button_text !== undefined || body.secondary !== undefined) {
    updates.secondary_button_text = (body.secondary_button_text || body.secondary).trim();
  }
  if (body.secondary_href !== undefined || body.secondaryHref !== undefined) {
    updates.secondary_href = (body.secondary_href || body.secondaryHref).trim();
  }
  if (body.image !== undefined) updates.image = body.image.trim();
  if (body.status !== undefined) updates.status = body.status;
  if (body.sort_order !== undefined && body.sort_order !== '') {
    updates.sort_order = parseInt(body.sort_order, 10);
  }

  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const normalized = normalizeHeroSlide(data);
      const idx = fallbackHeroSlides.findIndex((s) => String(s.id) === String(id));
      if (idx !== -1) fallbackHeroSlides[idx] = normalized;
      return sendSuccess(res, 'Hero slide updated successfully.', normalized);
    }
  } catch (err) {
    console.warn('Supabase updateHeroSlide fallback:', err.message);
  }

  const idx = fallbackHeroSlides.findIndex((s) => String(s.id) === String(id));
  if (idx === -1) return sendError(res, 'Hero slide not found.', 404);

  fallbackHeroSlides[idx] = normalizeHeroSlide({
    ...fallbackHeroSlides[idx],
    ...updates,
    id: fallbackHeroSlides[idx].id,
  });

  return sendSuccess(res, 'Hero slide updated successfully.', fallbackHeroSlides[idx]);
});

export const deleteHeroSlide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', id);

    if (!error) {
      fallbackHeroSlides = fallbackHeroSlides.filter((s) => String(s.id) !== String(id));
      return sendSuccess(res, 'Hero slide deleted successfully.');
    }
  } catch (err) {
    console.warn('Supabase deleteHeroSlide fallback:', err.message);
  }

  fallbackHeroSlides = fallbackHeroSlides.filter((s) => String(s.id) !== String(id));
  return sendSuccess(res, 'Hero slide deleted successfully.');
});

