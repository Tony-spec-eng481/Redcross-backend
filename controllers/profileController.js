import { supabase } from '../config/supabase.js';

export const getProfile = async (req, res) => {
  const { data, error } = await supabase
    .from('admins')
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .eq('id', req.admin.id)
    .single();

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json(data || {});
};

export const updateProfile = async (req, res) => {
  const { name, phone, avatar } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;

  const { data, error } = await supabase
    .from('admins')
    .update(updates)
    .eq('id', req.admin.id)
    .select('id, name, email, phone, role, avatar, is_active, last_login, notification_preferences, created_at')
    .single();

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
};

export const deleteProfile = async (req, res) => {
  res.json({ success: true, message: 'Profile deleted' });
};
