import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const l of env.split(/\r?\n/)) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0 && !process.env[t.slice(0, i).trim()])
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  { auth: { persistSession: false } },
);
(async () => {
  const { count: total } = await sb.from("leads").select("*", { count: "exact", head: true });
  const { count: gmaps } = await sb
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("source", "googlemaps_candidates");
  const { count: candidates } = await sb
    .from("googlemaps_candidates")
    .select("*", { count: "exact", head: true });
  const { data: top5 } = await sb
    .from("leads")
    .select("name, current_mode, source")
    .eq("source", "googlemaps_candidates")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log(`googlemaps_candidates: ${candidates} rows`);
  console.log(`leads total:           ${total}`);
  console.log(`  → from gmaps:         ${gmaps}`);
  console.log(`  → manual:             ${(total ?? 0) - (gmaps ?? 0)}`);
  console.log(`\nTop 5 gmaps leads (most recent):`);
  for (const l of top5 ?? []) {
    console.log(`  - ${l.name} [${l.current_mode}]`);
  }
})();
