import { NextResponse } from "next/server";
import { enrichCandidate } from "@/lib/research/enrich";

/**
 * POST /api/research/agent/enrich
 * Body: { id: uuid }
 * Fetches the candidate's website, extracts contacts + refined description
 * via OpenAI, and UPDATEs the googlemaps_candidates row. The Research tab
 * subscribes to UPDATE events and renders enrichment progressively.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }
  await enrichCandidate(id);
  return NextResponse.json({ ok: true, id });
}
