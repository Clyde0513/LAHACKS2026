import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn(
    '[supabase-admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB persistence disabled',
  );
}

/**
 * Service-role client for server-side operations.
 * Bypasses Row Level Security — never expose this to the browser.
 */
export const supabaseAdmin = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
