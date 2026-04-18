import { NextResponse } from "next/server";

/**
 * GET /api/stream/[sessionId] — SSE proxy from HR /sessions/{id}/messages/stream
 * to the browser, so the dashboard live transcript works without exposing
 * HR_API_KEY.
 *
 * Brain-repo: reference/api-cheatsheet.md ("SSE proxy" snippet).
 */
export async function GET(
  _req: Request,
  _ctx: { params: { sessionId: string } },
) {
  return NextResponse.json(
    { error: "not_implemented", see: "reference/api-cheatsheet.md" },
    { status: 501 },
  );
}
