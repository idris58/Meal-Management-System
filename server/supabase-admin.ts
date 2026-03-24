import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export function assertSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Public share routes require a server-side Supabase service role key.",
    );
  }

  return supabaseAdmin;
}
