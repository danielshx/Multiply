import { NextResponse } from "next/server";
import { sendEmail, EMAIL_FROM } from "@/lib/email/sender";
import { persistMessage, findLeadIdByContact } from "@/lib/supabase/persistMessage";

/**
 * POST /api/watcher/trigger-email — Email Agent branch of the Watcher Cron
 * Workflow. Sends a real outbound email via Gmail SMTP from EMAIL_AGENT_FROM
 * (defaults to happymultiply@gmail.com) to the lead.
 *
 * Body: {
 *   name?, company?, email, customer_goal?, current_time?, reason?
 * }
 *
 * Response includes the actual SMTP messageId so the caller can confirm.
 *
 * If GMAIL_APP_PASSWORD is missing, the route falls back to STUB mode and
 * returns ok=true with a stub note (so the watcher pipeline stays green
 * during local dev without credentials).
 */
type Body = {
  name?: string;
  company?: string;
  email?: string;
  customer_goal?: string;
  current_time?: string;
  reason?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.email) {
    return NextResponse.json(
      { ok: false, error: "email is required" },
      { status: 400 },
    );
  }

  const subject = subjectFor(body);
  const text = bodyTextFor(body);
  const html = bodyHtmlFor(body);

  const leadId = await findLeadIdByContact({ email: body.email });

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log(
      `[watcher/trigger-email] STUB (no GMAIL_APP_PASSWORD) — would send FROM=${EMAIL_FROM} TO=${body.email}`,
    );
    await persistMessage({
      lead_id: leadId,
      role: "system",
      channel: "email",
      content: `✉️ STUB email skipped (no GMAIL_APP_PASSWORD) — would have sent: "${subject}"`,
    });
    return NextResponse.json({
      ok: true,
      sent: false,
      stub: true,
      from: EMAIL_FROM,
      to: body.email,
      subject,
      reason: body.reason ?? null,
      note: "Set GMAIL_APP_PASSWORD in .env.local to send real emails.",
    });
  }

  const result = await sendEmail({
    to: body.email,
    subject,
    text,
    html,
    replyTo: EMAIL_FROM,
  });

  if (!result.ok) {
    console.error(`[watcher/trigger-email] FAILED to=${body.email} err=${result.error}`);
    await persistMessage({
      lead_id: leadId,
      role: "system",
      channel: "email",
      content: `✉️ Email FAILED to ${body.email}: ${result.error?.slice(0, 200)}`,
    });
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        from: EMAIL_FROM,
        to: body.email,
        subject,
        error: result.error,
      },
      { status: 502 },
    );
  }

  console.log(
    `[watcher/trigger-email] SENT message_id=${result.messageId} to=${body.email}`,
  );
  await persistMessage({
    lead_id: leadId,
    role: "agent",
    channel: "email",
    content: `✉️ Sent: "${subject}"\n\n${text.slice(0, 800)}`,
    hr_msg_id: result.messageId ?? null,
  });
  return NextResponse.json({
    ok: true,
    sent: true,
    from: EMAIL_FROM,
    to: body.email,
    subject,
    message_id: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    reason: body.reason ?? null,
  });
}

function subjectFor(body: Body): string {
  const company = body.company?.trim();
  const goal = body.customer_goal?.trim();
  if (goal && company) return `Multiply x ${company} — re: ${goal.slice(0, 60)}`;
  if (company) return `Multiply x ${company} — quick intro`;
  return "Multiply — quick intro";
}

function bodyTextFor(body: Body): string {
  const name = body.name?.trim() || "there";
  const company = body.company?.trim() || "your team";
  const goal = body.customer_goal?.trim();
  return [
    `Hi ${name},`,
    "",
    `I'm Alex from Multiply — we run AI sales calls in parallel for GTM teams.`,
    goal
      ? `I noticed you're looking into "${goal}", and figured a short async intro is faster than chasing a calendar slot.`
      : `Figured a short async intro is faster than chasing a calendar slot.`,
    "",
    `In one sentence: customers triple their booked meetings in month one without adding SDRs.`,
    "",
    `Two ways forward:`,
    `  1. Reply with the best 20-min slot for a live demo this week.`,
    `  2. Reply "send loom" and I'll drop a 3-min walkthrough video.`,
    "",
    `Either way, no pressure — and you can ignore this thread completely if it's not the right time for ${company}.`,
    "",
    `— Alex`,
    `Multiply (HappyRobot × TUM.ai)`,
    `${EMAIL_FROM}`,
  ].join("\n");
}

function bodyHtmlFor(body: Body): string {
  const name = body.name?.trim() || "there";
  const company = body.company?.trim() || "your team";
  const goal = body.customer_goal?.trim();
  const escGoal = goal ? escape(goal) : "";
  return `<!doctype html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.55; color: #111; max-width: 560px;">
<p>Hi ${escape(name)},</p>
<p>I'm Alex from <strong>Multiply</strong> — we run AI sales calls in parallel for GTM teams.</p>
${goal ? `<p>I noticed you're looking into "<em>${escGoal}</em>", and figured a short async intro is faster than chasing a calendar slot.</p>` : `<p>Figured a short async intro is faster than chasing a calendar slot.</p>`}
<p><strong>In one sentence:</strong> customers triple their booked meetings in month one without adding SDRs.</p>
<p>Two ways forward:</p>
<ol>
  <li>Reply with the best 20-min slot for a live demo this week.</li>
  <li>Reply <code>send loom</code> and I'll drop a 3-min walkthrough video.</li>
</ol>
<p style="color:#666; font-size:13px;">Either way, no pressure — and you can ignore this thread completely if it's not the right time for ${escape(company)}.</p>
<p>— Alex<br/>Multiply (HappyRobot × TUM.ai)<br/><a href="mailto:${EMAIL_FROM}">${EMAIL_FROM}</a></p>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
