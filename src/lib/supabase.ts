import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  if (!supabaseConfigured) {
    // Fail loudly if anything tries to query Supabase before env vars are set.
    // The UI can check `supabaseConfigured` to gracefully fall back to mock data.
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env.",
    );
  }
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Returns the singleton Supabase client. Lazily constructed so unit tests
 * and `supabaseConfigured`-checks don't accidentally throw at import time.
 */
export function getSupabase(): SupabaseClient {
  if (!_client) _client = buildClient();
  return _client;
}
