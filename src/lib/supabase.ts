import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve credentials from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate if real Supabase credentials are configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('offline.local') &&
  !supabaseAnonKey.includes('your_') &&
  !supabaseAnonKey.includes('placeholder')
);

/**
 * Supabase Client Instance
 * If configured: connects securely to your Supabase project.
 * If not yet configured: initializes an offline sandbox client with no hardcoded keys.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(
      'https://offline.local.supabase.co',
      'anon_public_sandbox_key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

export type { User, Session };
