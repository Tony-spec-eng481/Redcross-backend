import { supabase } from '../config/supabase.js';

export const getMessages = async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
  res.json(data || []);
};

export const sendMessage = async (req, res) => {
  const { text } = req.body;
  const { data, error } = await supabase.from('messages').insert([{ text }]);
  res.json({ success: true, data });
};
