import { NextResponse } from "next/server";

/**
 * POST /api/watcher/route — single fan-out endpoint for the Watcher HR
 * Workflow. The workflow's AI Generate node decides on a `decision` value
 * ("call" | "sms" | "email" | "skip") and POSTs the lead payload here together
 * with the decision + a short reasoning. We then dispatch server-side so the
 * HR workflow stays simple (no path/condition nodes needed).
 *
 * Routing:
 *   call  → /api/watcher/trigger-mini   (Mini Voice Agent, hot leads with phone)
 *   sms   → /api/watcher/trigger-sms    (Mini SMS Agent, warm leads with phone, German Twilio)
 *   email → /api/watcher/trigger-email  (Email Agent, cold leads or no phone)
 *   skip  → no-op
 *
 * Body:
 * {
 *   decision: "call" | "sms" | "email" | "skip",
 *   reasoning?: string,
 *   reason_changed?: string,
 *   lead: {
 *     lead_id?, name, company, phone_number, email,
 *     current_time, customer_goal
 *   }
 * }
 */
type Decision = "call" | "sms" | "email" | "skip";

type Lead = {
  lead_id?: string;
  name?: string;
  company?: string;
  phone_number?: string;
  email?: string;
  current_time?: string;
  customer_goal?: string;
  business_context?: Record<string, unknown>;
};

type Body = {
  decision?: string;
  reasoning?: string;
  reason_changed?: string;
  lead?: Lead;
};

const ROUTE_TO_PATH: Record<Exclude<Decision, "skip">, string> = {
  call: "/api/watcher/trigger-mini",
  sms: "/api/watcher/trigger-sms",
  email: "/api/watcher/trigger-email",
};

const ROUTE_TO_ACTION: Record<Exclude<Decision, "skip">, string> = {
  call: "mini_voice_agent",
  sms: "mini_sms_agent",
  email: "email_agent",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const decision = normalizeDecision(body.decision);
  const lead = body.lead ?? {};

  if (decision === "skip") {
    return NextResponse.json({
      ok: true,
      decision,
      action_taken: "none",
      reasoning: body.reasoning ?? null,
    });
  }

  if ((decision === "call" || decision === "sms") && !lead.phone_number) {
    return NextResponse.json({
      ok: false,
      decision,
      action_taken: "skipped_no_phone",
      reasoning: body.reasoning ?? null,
    });
  }
  if (decision === "email" && !lead.email) {
    return NextResponse.json({
      ok: false,
      decision,
      action_taken: "skipped_no_email",
      reasoning: body.reasoning ?? null,
    });
  }

  const origin = new URL(req.url).origin;
  const targetPath = ROUTE_TO_PATH[decision];

  const payload = {
    name: lead.name ?? "",
    company: lead.company ?? "",
    phone_number: lead.phone_number ?? "",
    email: lead.email ?? "",
    current_time: lead.current_time ?? new Date().toISOString(),
    customer_goal: lead.customer_goal ?? "",
    business_context: lead.business_context ?? null,
    reason: body.reasoning ?? body.reason_changed ?? "",
  };

  const res = await fetch(`${origin}${targetPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await res.text();
  return NextResponse.json({
    ok: res.ok,
    decision,
    action_taken: ROUTE_TO_ACTION[decision],
    reasoning: body.reasoning ?? null,
    downstream_status: res.status,
    downstream_response: safeJson(text),
  });
}

function normalizeDecision(raw: string | undefined): Decision {
  const v = (raw ?? "").trim().toLowerCase();
  if (v.startsWith("call") || v.includes("voice") || v.includes("phone")) return "call";
  if (v.startsWith("sms") || v.includes("text message") || v === "text") return "sms";
  if (v.startsWith("email") || v.startsWith("mail")) return "email";
  return "skip";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
