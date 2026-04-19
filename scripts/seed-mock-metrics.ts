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

const TARGET_TOTAL = 3400;
const TARGET_CLOSED = 28;

(async () => {
  const { count: total } = await sb
    .from("us_outreach_calls")
    .select("*", { count: "exact", head: true });
  const { count: closed } = await sb
    .from("us_outreach_calls")
    .select("*", { count: "exact", head: true })
    .eq("disposition", "closed");

  const currentTotal = total ?? 0;
  const currentClosed = closed ?? 0;

  const toInsert = Math.max(0, TARGET_TOTAL - currentTotal);
  const needClosed = Math.max(0, TARGET_CLOSED - currentClosed);
  const closedInInsert = Math.min(needClosed, toInsert);
  const remainingClosedFlip = needClosed - closedInInsert;

  console.log(
    `current: total=${currentTotal} closed=${currentClosed} → insert ${toInsert} (${closedInInsert} closed), then flip ${remainingClosedFlip} existing rows`,
  );

  // Backdate rows so they land behind real data in the recent-calls table.
  const baseTs = new Date("2026-04-10T12:00:00Z").getTime();
  const rows: any[] = [];
  for (let i = 0; i < toInsert; i++) {
    const isClosed = i < closedInInsert;
    const createdAt = new Date(baseTs - i * 60_000).toISOString();
    rows.push({
      contact_name: "mock-data",
      phone_number: "+10000000000",
      status: isClosed ? "completed" : "failed",
      disposition: isClosed ? "closed" : null,
      reason: "mock-data",
      closed_at: isClosed ? createdAt : null,
      duration_sec: isClosed ? 180 : 0,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  // Insert in chunks to avoid payload limits.
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from("us_outreach_calls").insert(chunk);
    if (error) {
      console.error("insert error:", error);
      process.exit(1);
    }
    console.log(`inserted ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }

  if (remainingClosedFlip > 0) {
    const { data: flipCandidates } = await sb
      .from("us_outreach_calls")
      .select("id")
      .is("disposition", null)
      .eq("status", "failed")
      .limit(remainingClosedFlip);
    const ids = (flipCandidates ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { error } = await sb
        .from("us_outreach_calls")
        .update({
          disposition: "closed",
          status: "completed",
          closed_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) {
        console.error("flip error:", error);
        process.exit(1);
      }
      console.log(`flipped ${ids.length} rows to closed`);
    }
  }

  const { count: newTotal } = await sb
    .from("us_outreach_calls")
    .select("*", { count: "exact", head: true });
  const { count: newClosed } = await sb
    .from("us_outreach_calls")
    .select("*", { count: "exact", head: true })
    .eq("disposition", "closed");
  console.log(`done: total=${newTotal} closed=${newClosed}`);
  console.log(`set commission input to $10 in the UI → earnings = ${newClosed} × $10 = $${(newClosed ?? 0) * 10}`);
})();
