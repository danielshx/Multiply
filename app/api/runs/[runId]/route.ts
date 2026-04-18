import { NextResponse } from "next/server";

/**
 * GET /api/runs/[runId] — return run + nodes + trace for the Run Trace UI.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 4 — Run trace).
 */
export async function GET(
  _req: Request,
  _ctx: { params: { runId: string } },
) {
  return NextResponse.json(
    { error: "not_implemented", see: "planning/06-ui-screens.md#screen-4" },
    { status: 501 },
  );
}
