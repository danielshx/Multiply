/**
 * Peek at the googlemaps_candidates table — count + 3 sample rows.
 *   pnpm tsx scripts/peek-candidates.ts
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

(async () => {
  const { count, error: cErr } = await sb
    .from("googlemaps_candidates")
    .select("*", { count: "exact", head: true });
  if (cErr) {
    console.error("count err:", cErr.message);
    process.exit(1);
  }
  console.log(`googlemaps_candidates: ${count ?? 0} rows total`);

  const { data, error } = await sb
    .from("googlemaps_candidates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  for (const row of data ?? []) {
    console.log("\n---");
    console.log(JSON.stringify(row, null, 2));
  }
})();

function loadDotEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    if (!process.env[t.slice(0, i).trim()]) {
      process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
}
