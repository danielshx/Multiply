import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client (service-role). Used by route handlers + server
 * components. Never import from a client component.
 */
export function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } },
  );
}
