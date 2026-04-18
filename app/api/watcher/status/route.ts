import { NextResponse } from "next/server";

/**
 * GET /api/watcher/status — small introspection endpoint the Live Monitor
 * polls every few seconds to show the watcher state in the UI.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    enabled: process.env.WATCHER_ENABLED === "true",
    max: Number(process.env.WATCHER_MAX_PER_TICK ?? 5),
    concurrency: Number(process.env.WATCHER_CONCURRENCY ?? 3),
    sms_enabled: process.env.SMS_ENABLED === "true",
    email_configured: !!process.env.GMAIL_APP_PASSWORD,
    hr_environment: process.env.HR_MINI_ENVIRONMENT ?? "staging",
  });
}
