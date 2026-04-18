import { NextResponse } from "next/server";

/**
 * POST /api/swarm/launch — fan out N HR workflow runs in parallel for the
 * 25-tile Swarm grid (or the 5 Live Swarm personas).
 *
 * Brain-repo: README.md lines 36–78 (Swarm tech architecture),
 * lines 116–196 (Live Swarm pitch flow).
 *
 * Body: { product_profile_id: string, leads: TriggerWorkflowPayload[] }
 * Returns: { run_ids: string[] }
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "README.md#idee-1" },
    { status: 501 },
  );
}
