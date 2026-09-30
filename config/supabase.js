import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url'
  ? process.env.SUPABASE_URL
  : 'https://placeholder.supabase.co';

const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key')
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key')
    ? process.env.SUPABASE_ANON_KEY
    : 'placeholder-key';

// Using the service role key for backend operations bypasses RLS,
// which is necessary for admin operations.
export const supabase = createClient(supabaseUrl, supabaseKey);
