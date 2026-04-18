import { NextResponse } from "next/server";

/**
 * POST /api/tools/book-meeting — HR custom tool: book a meeting in Google
 * Calendar via the Google Calendar MCP / API.
 *
 * Brain-repo: planning/05-happyrobot-workflows.md (book_testdrive tool spec),
 * planning/03-architecture.md (Flow C).
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "planning/05-happyrobot-workflows.md" },
    { status: 501 },
  );
}
