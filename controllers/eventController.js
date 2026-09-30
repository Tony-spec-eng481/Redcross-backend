import { supabase } from '../config/supabase.js';

export const getEvents = async (req, res) => {
  const { data, error } = await supabase.from('events').select('*');
  res.json(data || []);
};
