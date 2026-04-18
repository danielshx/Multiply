import { NextResponse } from "next/server";

/**
 * POST /api/tools/research — HR custom tool: enrich a lead from public
 * sources (LinkedIn / news / website).
 *
 * Brain-repo: README.md lines 38–43 (A9 Research Agent),
 * planning/05-happyrobot-workflows.md (Custom tools).
 *
 * Demo plan: 80% mocked from pre-scraped data, 2-3 live (README line 324).
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "README.md#feature-komposition" },
    { status: 501 },
  );
}
