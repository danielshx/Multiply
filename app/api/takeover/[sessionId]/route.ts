import { NextResponse } from "next/server";

/**
 * POST /api/takeover/[sessionId] — inject a human message into an HR session,
 * pausing the agent.
 *
 * Brain-repo: planning/03-architecture.md (Flow D — Takeover).
 */
export async function POST(
  _req: Request,
  _ctx: { params: { sessionId: string } },
) {
  return NextResponse.json(
    { error: "not_implemented", see: "planning/03-architecture.md#flow-d" },
    { status: 501 },
  );
}
