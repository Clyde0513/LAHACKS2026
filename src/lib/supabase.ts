import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set');
}

/**
 * Browser-safe Supabase client (anon/publishable key only).
 * Subject to Row Level Security — safe to ship in client bundles.
 */
export const supabase = url && anon ? createClient(url, anon) : null;
