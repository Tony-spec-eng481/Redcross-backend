import { supabase } from '../config/supabase.js';

export const getGallery = async (req, res) => {
  const { data, error } = await supabase.from('gallery').select('*').eq('status', 'approved');
  res.json(data || []);
};

export const submitImage = async (req, res) => {
  const { url } = req.body;
  const { data, error } = await supabase.from('gallery').insert([{ image_url: url, status: 'pending' }]);
  res.json({ success: true, message: 'Submitted for review' });
};
