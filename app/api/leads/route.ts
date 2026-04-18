import { NextResponse } from "next/server";

/**
 * POST /api/leads — create a lead and trigger an HR workflow run.
 *
 * Brain-repo: planning/03-architecture.md (Flow A — New lead comes in).
 * Stub.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "planning/03-architecture.md#flow-a" },
    { status: 501 },
  );
}
