import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Env-gated: the client only exists when both vars are provided. The app runs
// fully offline (mock catalog) without them; account features activate once the
// Supabase project is provisioned and these are set.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const isBackendConfigured = supabase !== null;
