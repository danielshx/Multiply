/**
 * Simulate one tick of the Watcher Cron Workflow locally.
 *
 *   1. POST /api/watcher/tick   (delta from Supabase + Cognee context per lead)
 *   2. For each change → apply the same deterministic routing rule the
 *      HR AI-Generate node uses (hot/warm + phone → call, cold or no
 *      phone → email).
 *   3. POST /api/watcher/route   (server-side fan-out → Mini Voice Agent
 *      OR Email stub).
 *
 * Run:
 *   pnpm tsx scripts/simulate-watcher.ts
 *   pnpm tsx scripts/simulate-watcher.ts --since=2026-04-18T00:00:00Z
 *   pnpm tsx scripts/simulate-watcher.ts --dry-run    # don't actually fan out
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const sinceArg = process.argv.find((a) => a.startsWith("--since="));
const SINCE = sinceArg ? sinceArg.slice("--since=".length) : null;
const DRY_RUN = process.argv.includes("--dry-run");

type Change = {
  lead_id: string;
  name: string;
  company: string;
  phone_number: string;
  email: string;
  customer_goal: string;
  current_time: string;
  current_mode: string;
  stage: string;
  reason_changed: string;
  cognee_context: string;
  recent_messages: { ts: string; role: string | null; channel: string | null; content: string }[];
};

type TickResp = {
  ok: boolean;
  count: number;
  since: string;
  next_since: string;
  changes: Change[];
};

type RouteResp = {
  ok: boolean;
  decision: string;
  action_taken: string;
  reasoning: string | null;
  downstream_status?: number;
  downstream_response?: unknown;
};

async function main() {
  console.log(
    `\n[simulate-watcher] APP_URL=${APP_URL} dry_run=${DRY_RUN} since=${SINCE ?? "auto (last 70s)"}`,
  );

  const tick = await postJson<TickResp>(`${APP_URL}/api/watcher/tick`, SINCE ? { since: SINCE } : {});
  console.log(
    `\n[1/2] tick → ${tick.count} change(s) since ${tick.since} (next_since=${tick.next_since})`,
  );

  if (tick.count === 0) {
    console.log("  (no changes — try --since=2026-04-18T00:00:00Z to widen the window)");
    return;
  }

  const decisions = tick.changes.map((c) => ({ lead: c, ...decide(c) }));

  console.log("\n[2/2] decisions (before fan-out):");
  for (const d of decisions) {
    console.log(
      `  - ${pad(d.lead.name, 18)} | ${pad(d.lead.company, 14)} | mode=${pad(d.lead.current_mode, 4)} | phone=${pad(d.lead.phone_number || "(none)", 18)} | → ${d.decision.toUpperCase()}  (${d.reasoning})`,
    );
  }

  if (DRY_RUN) {
    console.log("\n--dry-run set → not calling /api/watcher/route. Done.");
    return;
  }

  console.log("\n[fan-out] POST /api/watcher/route per change:");
  for (const d of decisions) {
    const body = {
      decision: d.decision,
      reasoning: d.reasoning,
      reason_changed: d.lead.reason_changed,
      lead: {
        lead_id: d.lead.lead_id,
        name: d.lead.name,
        company: d.lead.company,
        phone_number: d.lead.phone_number,
        email: d.lead.email,
        current_time: d.lead.current_time,
        customer_goal: d.lead.customer_goal,
      },
    };
    try {
      const res = await postJson<RouteResp>(`${APP_URL}/api/watcher/route`, body);
      console.log(
        `  ✓ ${pad(d.lead.name, 18)} → action=${pad(res.action_taken, 22)} ok=${res.ok} downstream=${res.downstream_status ?? "n/a"}`,
      );
    } catch (err) {
      console.log(`  ✗ ${pad(d.lead.name, 18)} → ERROR ${(err as Error).message}`);
    }
  }

  console.log(
    "\n[done] Watch HR runs at https://platform.eu.happyrobot.ai/tumaimultiply/workflow/ow7ufmoe7mws/runs",
  );
}

function decide(c: Change): {
  decision: "call" | "sms" | "email" | "skip";
  reasoning: string;
} {
  const phone = (c.phone_number ?? "").trim();
  const email = (c.email ?? "").trim();
  const mode = (c.current_mode ?? "").toLowerCase();
  const ctx = (c.cognee_context ?? "").toLowerCase();

  if (ctx.includes("booked") || ctx.includes("meeting_booked"))
    return { decision: "skip", reasoning: "already booked recently" };
  if (ctx.includes("opt_out") || ctx.includes("unsubscribe"))
    return { decision: "skip", reasoning: "opted out" };

  if (!phone && !email) return { decision: "skip", reasoning: "no phone and no email" };
  if (!phone) return { decision: "email", reasoning: "no phone → email" };

  if (mode === "hot") return { decision: "call", reasoning: "hot lead with phone → voice call" };
  if (mode === "warm") return { decision: "sms", reasoning: "warm lead with phone → SMS" };
  if (mode === "cold") return { decision: "sms", reasoning: "cold lead with phone → SMS first try" };
  return { decision: "email", reasoning: `unknown mode '${mode}' → default email` };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`non-JSON response from ${url}: ${text.slice(0, 200)}`);
  }
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}

function loadDotEnvLocal(): void {
  try {
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
  } catch {
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
