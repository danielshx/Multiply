"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Used by client components for Realtime
 * subscriptions on `leads` and `messages`.
 *
 * Brain-repo: planning/03-architecture.md (DB schema, Realtime).
 */
export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
