/**
 * Seed Julian, Daniel, David into Supabase (`leads`) + Cognee (`multiply`)
 * so the Watcher Cron Workflow has real data to react to.
 *
 * The Watcher reads `leads` + `messages` from Supabase and pulls interaction
 * context from Cognee for each lead. To make the Watcher pick these three up
 * on its next tick, we also insert a fresh inbound `messages` row per lead
 * (which is what `reason_changed: "new_message"` expects).
 *
 * Run:
 *   pnpm tsx scripts/seed-trio.ts
 *   pnpm tsx scripts/seed-trio.ts --reset   # delete existing rows first
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = required("SUPABASE_SERVICE_ROLE");
const COGNEE_URL = required("COGNEE_API_URL");
const COGNEE_KEY = required("COGNEE_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type Trio = {
  name: string;
  company: string;
  role: string;
  phone: string | null;
  email: string;
  customer_goal: string;
  stage: "new" | "engaged" | "qualified" | "booked";
  current_mode: "cold" | "warm" | "hot";
  seed_facts: string[];
  inbound_message: string;
};

const TRIO: Trio[] = [
  {
    name: "Julian Hähle",
    company: "HappyRobot",
    role: "Engineer (joining at TUM.ai Makathon)",
    phone: "+4915170846448",
    email: "julian.haehle@gmail.com",
    customer_goal: "Give technical feedback on Multiply (reviewer perspective)",
    stage: "new",
    current_mode: "cold",
    seed_facts: [
      "Julian Hähle is a HappyRobot engineer who joined the TUM.ai Makathon as a reviewer.",
      "Primary intent is technical feedback on the Multiply build, not buying — definitely cold from a sales perspective.",
      "Best treated as a friendly evaluator: prefers async written context over synchronous calls.",
      "Knows the HappyRobot platform deeply — skip product 101.",
      "Channel preference: email (he's busy, async, reviewer mindset).",
    ],
    inbound_message:
      "Hey, no rush — could you just shoot me a short email with the Multiply architecture and one sample call transcript? I'll review when I get a free moment.",
  },
  {
    name: "Daniel Shamsi",
    company: "OpenAI",
    role: "Praktikant (Intern)",
    phone: "+4917681136011",
    email: "danielshamsi24@gmail.com",
    customer_goal: "Allgemeines Interesse an KI / GenAI applications",
    stage: "new",
    current_mode: "hot",
    seed_facts: [
      "Daniel Shamsi is an intern at OpenAI; broad interest in GenAI applications.",
      "Curious about what Multiply does end-to-end (swarm voice + cognee graph).",
      "High signal-to-noise: hot but not yet a buyer — likely advocate / sharer.",
      "Reachable on +4917681136011, prefers concrete demos over slides.",
      "Speaks German and English; default English in tech context.",
    ],
    inbound_message:
      "Saw the Multiply teaser — really interested in how the parallel agents stay coordinated. Can I see a live call?",
  },
  {
    name: "David Fersing",
    company: "LMU München",
    role: "Student (loves to learn AI)",
    phone: "+491774890995",
    email: "davidfersing90@gmail.com",
    customer_goal:
      "Wants to take an AI course, loves learning — explore Multiply as a learning project",
    stage: "new",
    current_mode: "hot",
    seed_facts: [
      "David Fersing is an LMU München student passionate about AI; wants to take an AI course.",
      "Looking at Multiply as a learning vehicle, not a procurement decision.",
      "Hot interest level: will engage on detail, ask follow-ups, share with peers.",
      "Best channel: phone (+491774890995) for live walkthroughs; email for resources.",
      "Treat conversation as mentor → student: explain trade-offs, recommend next steps.",
    ],
    inbound_message:
      "Hi! I'm a student at LMU and want to learn how Multiply works under the hood — could you walk me through the AI agent design?",
  },
];

const reset = process.argv.includes("--reset");

async function main() {
  if (reset) {
    console.log("\n[reset] removing existing seeded leads + messages …");
    const emails = TRIO.map((t) => t.email);
    const { data: oldLeads } = await supabase
      .from("leads")
      .select("id, email")
      .in("email", emails);
    const oldIds = (oldLeads ?? []).map((l) => l.id as string);
    if (oldIds.length > 0) {
      await supabase.from("messages").delete().in("lead_id", oldIds);
      await supabase.from("leads").delete().in("id", oldIds);
      console.log(`  removed ${oldIds.length} lead(s) and their messages.`);
    } else {
      console.log("  nothing to remove.");
    }
  }

  for (const t of TRIO) {
    console.log(`\n→ ${t.name} (${t.company})`);

    const insertedLead = await upsertLead(t);
    console.log(`  supabase: lead id ${insertedLead.id}`);

    await insertInboundMessage(insertedLead.id, t);
    console.log(`  supabase: inbound message inserted`);

    const ok = await ingestCognee(t);
    console.log(`  cognee:   ${ok ? "ingested" : "FAILED"}`);
  }

  console.log("\n→ cognee.cognify (build graph in background) …");
  await cogneeCognify();
  console.log("  triggered.");

  console.log("\nDone. Within ~60s the Watcher Cron should pick these up.");
}

async function upsertLead(t: Trio): Promise<{ id: string }> {
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", t.email)
    .maybeSingle();

  const row = {
    name: t.name,
    phone: t.phone,
    email: t.email,
    interest: t.customer_goal,
    stage: t.stage,
    current_mode: t.current_mode,
    source: "seed-trio",
    metadata: {
      company: t.company,
      role: t.role,
      seeded_at: new Date().toISOString(),
      seed_facts: t.seed_facts,
    },
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("leads")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id as string };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return { id: data!.id as string };
}

async function insertInboundMessage(leadId: string, t: Trio): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    lead_id: leadId,
    role: "lead",
    channel: "seed",
    content: t.inbound_message,
    ts: new Date().toISOString(),
  });
  if (error) throw error;
}

async function ingestCognee(t: Trio): Promise<boolean> {
  const text = [
    `LEAD PROFILE — ${t.name} (${t.role}) at ${t.company}.`,
    `Customer goal: ${t.customer_goal}.`,
    `Stage: ${t.stage}. Current mode (heat): ${t.current_mode}.`,
    `Phone: ${t.phone ?? "n/a"}. Email: ${t.email}.`,
    "",
    "Key facts:",
    ...t.seed_facts.map((f) => `- ${f}`),
    "",
    `Most recent inbound (${new Date().toISOString()}): "${t.inbound_message}"`,
  ].join("\n");

  try {
    const res = await fetch(`${COGNEE_URL}/api/v1/add_text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": COGNEE_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify({
        text_data: [text],
        datasetName: "multiply",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`  cognee error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("  cognee fetch failed:", (err as Error).message);
    return false;
  }
}

async function cogneeCognify(): Promise<void> {
  const res = await fetch(`${COGNEE_URL}/api/v1/cognify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": COGNEE_KEY,
      Accept: "application/json",
    },
    body: JSON.stringify({ datasets: ["multiply"], runInBackground: true }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`  cognify warning: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
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

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}. Put it in .env.local`);
    process.exit(1);
  }
  return v;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
