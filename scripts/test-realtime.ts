/**
 * End-to-end Realtime smoke test.
 *
 *   1. Subscribes to `messages` via Supabase Realtime (anon key, like the browser does)
 *   2. Inserts a test row via service role
 *   3. Waits up to 8s for the realtime callback to fire
 *   4. Reports whether it worked + cleans up the test row
 *
 *   pnpm tsx scripts/test-realtime.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

const subscriber = createClient(url, anon, { auth: { persistSession: false } });
const writer = createClient(url, service, { auth: { persistSession: false } });

const testTag = `realtime_smoke_test_${Date.now()}`;

(async () => {
  let received = false;
  let receivedRow: Record<string, unknown> | null = null;

  const channel = subscriber
    .channel(`smoke-${Date.now()}`)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: { new: Record<string, unknown> }) => {
        const content = String(payload.new?.content ?? "");
        if (content.includes(testTag)) {
          received = true;
          receivedRow = payload.new;
          console.log(`✓ realtime callback fired for messages INSERT`);
        }
      },
    )
    .subscribe((status) => {
      console.log(`  subscribe status: ${status}`);
    });

  await new Promise((r) => setTimeout(r, 1500));

  console.log(`\n→ inserting test row tagged ${testTag}`);
  const { data: ins, error: insErr } = await writer
    .from("messages")
    .insert({
      lead_id: null,
      role: "system",
      channel: "watcher",
      content: `${testTag} — if you see this fired in /live realtime, you're golden`,
    })
    .select()
    .single();
  if (insErr) {
    console.error(`✗ insert failed: ${insErr.message}`);
    process.exit(1);
  }

  for (let i = 0; i < 16 && !received; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }

  await writer.from("messages").delete().eq("id", ins!.id);
  await subscriber.removeChannel(channel);

  if (received) {
    console.log(
      `\n✅ Realtime works. /live will receive new messages live (hard-refresh the page first).`,
    );
    console.log(`   Sample row: ${JSON.stringify(receivedRow).slice(0, 200)}`);
    process.exit(0);
  } else {
    console.log(`\n❌ Realtime did NOT fire within 8s.`);
    console.log(`   Most likely 'messages' is not in the supabase_realtime publication.`);
    console.log(`\n   Fix: in Supabase dashboard → Database → Publications → click on`);
    console.log(`        'supabase_realtime' → in the table list, toggle ON for:`);
    console.log(`          - public.messages`);
    console.log(`          - public.leads`);
    console.log(`\n   OR run this in the SQL editor:`);
    console.log(`     alter publication supabase_realtime add table public.messages;`);
    console.log(`     alter publication supabase_realtime add table public.leads;`);
    process.exit(1);
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
