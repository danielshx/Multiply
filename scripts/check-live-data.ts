/**
 * Quick sanity check: list the recent messages so we can confirm
 * persistMessage() wrote them and the /live page will show them.
 *
 *   pnpm tsx scripts/check-live-data.ts
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
  const { data, error } = await sb
    .from("messages")
    .select("ts, role, channel, content, lead_id")
    .order("ts", { ascending: false })
    .limit(15);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Last ${data?.length ?? 0} messages:\n`);
  for (const m of data ?? []) {
    const t = new Date(m.ts).toLocaleTimeString();
    const lead = (m.lead_id ?? "—").slice(0, 8);
    const c = (m.content ?? "").replace(/\s+/g, " ").slice(0, 80);
    console.log(
      `  ${t} | ${(m.role ?? "?").padEnd(6)} | ${(m.channel ?? "?").padEnd(7)} | lead=${lead} | ${c}`,
    );
  }
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
