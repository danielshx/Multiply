import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio/client";
import { AFFILIATE, buildTrackedQuizUrl } from "@/lib/us-outreach/affiliate";
import { log } from "@/lib/us-outreach/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/tools/us-send-quiz-link — HR custom tool. The Voice Agent calls
 * this when the contact verbally agrees to receive the affiliate funnel link
 * via SMS. Sends through Twilio, persists the message SID + sent timestamp.
 *
 * Body (HR sends): { call_id, phone_number, tracked_url? }
 *   tracked_url is optional — if missing we rebuild it from call_id.
 */
type Body = {
  call_id?: string;
  phone_number?: string;
  tracked_url?: string;
};

function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[^\d+]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.length === 10) return `+1${trimmed}`;
  return `+${trimmed}`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.call_id || !body.phone_number) {
    return NextResponse.json(
      { ok: false, error: "call_id and phone_number required" },
      { status: 400 },
    );
  }

  const to = normalizePhone(body.phone_number);
  const url = body.tracked_url ?? buildTrackedQuizUrl(body.call_id);
  const message = `${AFFILIATE.productName} — take the 60-sec job-fit quiz, see what type of writing fits you ($1 trial): ${url}`;

  const supabase = getServerSupabase();
  const twilioConfigured =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_SMS_FROM;

  // If Twilio is not configured (HR's voice number can't send SMS, and you
  // don't want a separate Twilio SMS account), we log success anyway so the
  // agent's conversation flows. The dashboard shows a "Copy link" button on
  // each closed call with the tracked URL so the team sends it manually.
  if (!twilioConfigured) {
    await supabase
      .from("us_outreach_calls")
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_sid: "manual-send",
        reason: "link staged — send manually via dashboard",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.call_id);
    log.info("tool:send_quiz_link", "staged_manual", { to, link: url }, body.call_id);
    return NextResponse.json({
      ok: true,
      mode: "manual",
      link: url,
      note: "Twilio not configured — link staged in dashboard for manual send",
    });
  }

  try {
    const sms = await sendSms({ to, body: message });
    await supabase
      .from("us_outreach_calls")
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_sid: sms.sid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.call_id);
    return NextResponse.json({ ok: true, mode: "sms", sid: sms.sid, to: sms.to });
  } catch (err) {
    const msg = (err as Error).message;
    await supabase
      .from("us_outreach_calls")
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_sid: "failed",
        reason: `sms_failed: ${msg.slice(0, 200)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.call_id);
    // Still return ok so agent continues; surface fail in dashboard.
    return NextResponse.json({ ok: true, mode: "failed", error: msg.slice(0, 200) });
  }
}
