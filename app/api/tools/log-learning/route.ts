import { NextResponse } from "next/server";

/**
 * POST /api/tools/log-learning — HR custom tool: persist a Learning
 * (pattern → trigger) to Supabase + HR Twin DB.
 *
 * Hero feature: README.md lines 267–275 ("Live-Learning sichtbar machen").
 * Agent #3 fails on objection → Learning logged → Agent #47 applies it.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", see: "README.md#live-learning" },
    { status: 501 },
  );
}
