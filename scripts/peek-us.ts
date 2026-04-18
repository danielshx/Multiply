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
  const { count: cCount } = await sb.from("us_outreach_calls").select("*", { count: "exact", head: true });
  const { count: mCount } = await sb.from("us_outreach_messages").select("*", { count: "exact", head: true });
  const { data: calls } = await sb.from("us_outreach_calls").select("*").order("created_at", { ascending: false }).limit(3);
  const { data: msgs } = await sb.from("us_outreach_messages").select("*").order("ts", { ascending: false }).limit(3);
  console.log(`us_outreach_calls: ${cCount} rows`);
  console.log(`us_outreach_messages: ${mCount} rows`);
  console.log(`\nSample us_outreach_calls:\n${JSON.stringify(calls, null, 2)}`);
  console.log(`\nSample us_outreach_messages:\n${JSON.stringify(msgs, null, 2)}`);
})();
