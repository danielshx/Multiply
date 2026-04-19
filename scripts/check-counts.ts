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
  const { count: total } = await sb.from("us_outreach_calls").select("*", { count: "exact", head: true });
  const { count: closed } = await sb.from("us_outreach_calls").select("*", { count: "exact", head: true }).eq("disposition", "closed");
  const { count: failed } = await sb.from("us_outreach_calls").select("*", { count: "exact", head: true }).eq("status", "failed");
  const { count: notInt } = await sb.from("us_outreach_calls").select("*", { count: "exact", head: true }).eq("disposition", "not_interested");
  console.log({ total, closed, failed, not_interested: notInt });
})();
