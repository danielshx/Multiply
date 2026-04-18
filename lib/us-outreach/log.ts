import { getServerSupabase } from "@/lib/supabase/server";

type Level = "info" | "warn" | "error";

/**
 * Append a structured log entry to us_outreach_logs. Best-effort — silently
 * swallows its own errors so logging can never break the caller.
 */
export async function logEvent(
  level: Level,
  source: string,
  event: string,
  detail: Record<string, unknown> = {},
  callId?: string | null,
): Promise<void> {
  try {
    const sb = getServerSupabase();
    await sb.from("us_outreach_logs").insert({
      level,
      source,
      event,
      detail,
      call_id: callId ?? null,
    });
  } catch {
    /* ignore */
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
