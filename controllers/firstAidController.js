import { supabase } from '../config/supabase.js';

export const getFirstAid = async (req, res) => {
  const { data, error } = await supabase
    .from('first_aid')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json(data || []);
};

export const askQuestion = async (req, res) => {
  const { text, question, asked_by } = req.body;
  const qText = question || text;
  if (!qText) return res.status(400).json({ success: false, error: 'Question text is required' });

  const { data, error } = await supabase
    .from('questions')
    .insert([{ question: qText, asked_by: asked_by || 'Anonymous', status: 'unanswered' }])
    .select();

  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, message: 'Question asked', data: data?.[0] });
};
