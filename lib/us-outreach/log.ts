import { getServerSupabase } from "@/lib/supabase/server";
import { slackNotify } from "@/lib/slack";

type Level = "info" | "warn" | "error";

// Events we broadcast to Slack when SLACK_WEBHOOK_URL is set. Others just
// land in us_outreach_logs.
const SLACK_EVENTS = new Set([
  "call_row_created",
  "hr_triggered",
  "status_queued",
  "status_in-progress",
  "status_completed",
  "status_failed",
  "status_error",
  "closed",
  "interested_no_sms",
  "callback",
  "not_interested",
  "staged_manual",
  "canceled",
  "hr_trigger_failed",
  "sync_kick_failed",
]);

function slackText(
  level: Level,
  source: string,
  event: string,
  detail: Record<string, unknown>,
  callId?: string | null,
): string {
  const emoji = level === "error" ? "🚨" : level === "warn" ? "⚠️" : sourceEmoji(source, event);
  const shortId = callId ? callId.slice(0, 8) : "—";
  const bits: string[] = [];
  for (const [k, v] of Object.entries(detail)) {
    if (v == null) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    bits.push(`${k}=${s.length > 60 ? s.slice(0, 57) + "…" : s}`);
  }
  const detailStr = bits.length ? ` · ${bits.join(" · ")}` : "";
  return `${emoji} *${source}* \`${event}\` _call ${shortId}_${detailStr}`;
}

function sourceEmoji(source: string, event: string): string {
  if (event === "closed") return "💰";
  if (event === "not_interested") return "👎";
  if (event === "callback") return "⏰";
  if (event === "interested_no_sms") return "🤔";
  if (event === "staged_manual") return "📨";
  if (event === "canceled") return "✂️";
  if (event.startsWith("status_completed")) return "✅";
  if (event.startsWith("status_in-progress")) return "🎙️";
  if (event.startsWith("status_queued")) return "📞";
  if (event.startsWith("status_failed") || event.startsWith("status_error")) return "❌";
  if (event === "hr_triggered") return "🚀";
  if (event === "call_row_created") return "🆕";
  return "·";
}

/**
 * Append a structured log entry to us_outreach_logs AND (best-effort) post
 * to Slack if it's an important event + webhook is configured. Silently
 * swallows its own errors so logging can never break the caller.
 */
export async function logEvent(
  level: Level,
  source: string,
  event: string,
  detail: Record<string, unknown> = {},
  callId?: string | null,
): Promise<void> {
  const sb = getServerSupabase();
  // fire-and-forget DB insert
  sb.from("us_outreach_logs")
    .insert({ level, source, event, detail, call_id: callId ?? null })
    .then(
      () => null,
      () => null,
    );

  // Fire Slack for meaningful events
  if (level === "error" || SLACK_EVENTS.has(event)) {
    slackNotify({ text: slackText(level, source, event, detail, callId) }).catch(
      () => null,
    );
  }
}

export const log = {
  info: (source: string, event: string, detail?: Record<string, unknown>, callId?: string | null) =>
    logEvent("info", source, event, detail ?? {}, callId),
  warn: (source: string, event: string, detail?: Record<string, unknown>, callId?: string | null) =>
    logEvent("warn", source, event, detail ?? {}, callId),
  error: (source: string, event: string, detail?: Record<string, unknown>, callId?: string | null) =>
    logEvent("error", source, event, detail ?? {}, callId),
};
