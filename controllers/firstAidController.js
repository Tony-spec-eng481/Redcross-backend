import { supabase } from '../config/supabase.js';

export const getFirstAid = async (req, res) => {
  const { data, error } = await supabase.from('first_aid').select('*');
  res.json(data || []);
};

export const askQuestion = async (req, res) => {
  const { text } = req.body;
  await supabase.from('questions').insert([{ text }]);
  res.json({ success: true, message: 'Question asked' });
};
