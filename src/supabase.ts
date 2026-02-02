import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create client only if configured (avoids errors during local dev without Supabase)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Database row type (snake_case to match PostgreSQL conventions)
export interface TaskRow {
  id: string;
  owner_id?: string;
  user_id?: string;
  title: string;
  domain: string | null;
  type: string;
  priority: string;
  status: string;
  description: string;
  co_authors: string | null;
  deadline: string | null;
  deadline_note: string | null;
  is_favorite: boolean;
  section: string | null;
  subsection: string | null;
  source: string | null;
  updated_at: string;
  deleted_at?: string | null;
  created_at: string;
}
