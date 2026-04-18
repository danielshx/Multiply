/**
 * Enables Supabase Realtime on `leads` + `messages` by adding them to the
 * `supabase_realtime` publication. Idempotent: safe to run multiple times.
 *
 *   pnpm tsx scripts/enable-realtime.ts
 *
 * Note: requires SUPABASE_SERVICE_ROLE in .env.local (already set).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  { auth: { persistSession: false } },
);

const TABLES = ["leads", "messages"];

(async () => {
  for (const t of TABLES) {
    // Try to add the table to the realtime publication.
    // If it's already a member, Postgres throws 42710 — we treat that as ok.
    const sql = `alter publication supabase_realtime add table public.${t};`;
    const { error } = await sb.rpc("exec_sql", { sql }).then(
      (r) => r as { error: { message: string } | null },
      (e: Error) => ({ error: { message: e.message } }),
    );

    if (!error) {
      console.log(`✓ ${t}: realtime enabled`);
      continue;
    }

    if (
      error.message.includes("already member") ||
      error.message.includes("already exists") ||
      error.message.includes("function public.exec_sql")
    ) {
      // either fine OR exec_sql RPC isn't available — fall back to a direct
      // PostgREST hit isn't possible for ALTER PUBLICATION, so we'll just
      // tell the user to run the SQL manually.
      if (error.message.includes("function public.exec_sql")) {
        console.log(
          `\n⚠️  Your Supabase project doesn't expose an exec_sql RPC.\n   Run this SQL manually in https://supabase.com/dashboard/project/_/sql:\n`,
        );
        for (const x of TABLES) {
          console.log(`     alter publication supabase_realtime add table public.${x};`);
        }
        console.log("");
        process.exit(2);
      }
      console.log(`✓ ${t}: already in supabase_realtime publication`);
      continue;
    }

    console.error(`✗ ${t}: ${error.message}`);
  }

  console.log("\nDone. Hard-refresh /live (Ctrl+F5) and new inserts will stream live.");
})();

function loadDotEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 1) continue;
    const k = trimmed.slice(0, i).trim();
    const v = trimmed.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
