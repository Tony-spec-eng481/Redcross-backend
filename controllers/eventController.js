import { supabase } from '../config/supabase.js';

/**
 * GET /api/v1/events OR /api/events
 * Fetch all approved events for public website and portal calendar
 */
export const getEvents = async (req, res) => {
  try {
    const { category, search, limit } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'approved');

    if (category && category !== 'all') {
      query = query.ilike('category', `%${category}%`);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`);
    }

    query = query.order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message, error: error.message, data: [] });
    }

    // Return format compatible with array or object consumers
    const formatted = (data || []).map(ev => ({
      ...ev,
      date_formatted: ev.date ? new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      day_num: ev.date ? new Date(ev.date).getDate() : '',
      month_year: ev.date ? new Date(ev.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '',
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error fetching events', error: err.message });
  }
};

/**
 * GET /api/v1/events/my OR /api/events/my
 * Fetch events submitted by a member (filtered by email or name)
 */
export const getMyEvents = async (req, res) => {
  try {
    const { email, name, submitter_id } = req.query;

    let query = supabase.from('events').select('*');

    if (email) {
      query = query.ilike('submitted_by_email', email.trim());
    } else if (name) {
      query = query.ilike('submitted_by_name', name.trim());
    } else if (submitter_id) {
      query = query.eq('submitted_by', submitter_id);
    } else {
      // If no identifier is passed, return empty or all user's submissions
      return res.json([]);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message, data: [] });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your events', error: err.message });
  }
};

/**
 * POST /api/v1/events OR /api/events
 * Member submits a new event for admin approval
 */
export const submitEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      location,
      description,
      image_url,
      category,
      submitted_by_name,
      submitted_by_email,
      submitted_by,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Event title is required.' });
    }

    const newEvent = {
      title: title.trim(),
      date: date || null,
      time: time || null,
      location: location?.trim() || '',
      description: description?.trim() || '',
      image_url: image_url?.trim() || '',
      category: category?.trim() || 'General',
      status: 'pending', // Member submitted events must always be pending approval
      submitted_by_name: submitted_by_name?.trim() || 'Chapter Member',
      submitted_by_email: submitted_by_email?.trim() || '',
      submitted_by: submitted_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('events')
      .insert([newEvent])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Insert admin notification
    try {
      await supabase.from('notifications').insert([{
        type: 'event',
        text: `New event proposed: "${data.title}" by ${newEvent.submitted_by_name} (Pending Approval)`,
        link: 'events',
        is_read: false,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      // Ignore notification insert failure
    }

    return res.status(201).json({
      success: true,
      message: 'Event submitted successfully! It will be published once approved by an administrator.',
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to submit event', error: err.message });
  }
};

/**
 * PATCH /api/v1/events/:id OR /api/events/:id
 * Member updates their submitted event
 */
export const updateMemberEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      date,
      time,
      location,
      description,
      image_url,
      category,
      submitted_by_email,
    } = req.body;

    // Check if event exists
    const { data: existing, error: findErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const updates = {
      updated_at: new Date().toISOString(),
      status: 'pending', // Re-evaluate whenever edited by member
      rejection_reason: null,
    };

    if (title !== undefined) updates.title = title.trim();
    if (date !== undefined) updates.date = date || null;
    if (time !== undefined) updates.time = time || null;
    if (location !== undefined) updates.location = location.trim();
    if (description !== undefined) updates.description = description.trim();
    if (image_url !== undefined) updates.image_url = image_url.trim();
    if (category !== undefined) updates.category = category.trim();

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated and submitted for re-approval.',
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update event', error: err.message });
  }
};

/**
 * DELETE /api/v1/events/:id OR /api/events/:id
 * Member deletes an event they submitted
 */
export const deleteMemberEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete event', error: err.message });
  }
};
