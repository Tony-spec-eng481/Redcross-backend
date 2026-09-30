import { supabase } from '../config/supabase.js';

export const getProfile = async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0] || {});
};

export const updateProfile = async (req, res) => {
  const { data, error } = await supabase.from('users').update(req.body).eq('id', req.body.id);
  res.json({ success: true, data });
};

export const deleteProfile = async (req, res) => {
  res.json({ success: true, message: 'Profile deleted' });
};
