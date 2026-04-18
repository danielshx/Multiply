import { NextResponse } from "next/server";

/**
 * POST /api/hr-webhook — receives HappyRobot events
 * (run.completed, run.failed, message.created, contact.updated).
 *
 * Brain-repo: planning/03-architecture.md (Flows B, C, D),
 * reference/api-cheatsheet.md ("Receive webhooks").
 *
 * TODO: verify WEBHOOK_SECRET, dispatch by event.type, write to Supabase.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "planning/03-architecture.md" },
    { status: 501 },
  );
}
