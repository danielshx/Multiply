import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/research/agent/callback
 * Receives results from the HappyRobot Research Agent workflow and inserts
 * each place into googlemaps_candidates.
 *
 * Accepted shapes:
 *   { topic, agent, candidates: [{ place_name, phone_number, company_type, ... }] }
 *   { topic, agent, places_json: "[...]" }
 *   { topic, agent, ...single_candidate_fields }
 */
type Candidate = {
  place_name?: string;
  name?: string;
  phone_number?: string;
  phone?: string;
  company_type?: string;
  category?: string;
  type?: string;
  address?: string;
  formatted_address?: string;
  website?: string;
  email?: string;
  rating?: number | string;
  review_count?: number | string;
  user_ratings_total?: number | string;
  hours?: string;
  opening_hours?: string;
  description?: string;
  sales_notes?: string;
  notes?: string;
  google_place_id?: string;
  place_id?: string;
  [k: string]: unknown;
};

function normalize(c: Candidate, topic: string, agent: string) {
  return {
    agent_name: agent || null,
    topic: topic || null,
    place_name: c.place_name ?? c.name ?? null,
    phone_number: c.phone_number ?? c.phone ?? null,
    company_type: c.company_type ?? c.category ?? c.type ?? null,
    address: c.address ?? c.formatted_address ?? null,
    website: (c.website as string | undefined) ?? null,
    email: (c.email as string | undefined) ?? null,
    rating: c.rating !== undefined ? Number(c.rating) || null : null,
    review_count:
      c.review_count !== undefined
        ? Number(c.review_count) || null
        : c.user_ratings_total !== undefined
          ? Number(c.user_ratings_total) || null
          : null,
    hours: (c.hours as string | undefined) ?? (c.opening_hours as string | undefined) ?? null,
    description: (c.description as string | undefined) ?? null,
    sales_notes: (c.sales_notes as string | undefined) ?? (c.notes as string | undefined) ?? null,
    google_place_id: (c.google_place_id as string | undefined) ?? (c.place_id as string | undefined) ?? null,
    raw: c,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const topic = (body.topic as string | undefined) ?? "";
  const agent = (body.agent as string | undefined) ?? "";

  let candidates: Candidate[] = [];

  if (Array.isArray(body.candidates)) {
    candidates = body.candidates as Candidate[];
  } else if (Array.isArray(body.places)) {
    candidates = body.places as Candidate[];
  } else if (typeof body.places_json === "string") {
    try {
      const parsed = JSON.parse(body.places_json);
      if (Array.isArray(parsed)) candidates = parsed as Candidate[];
    } catch {
      /* ignore */
    }
  }

  if (candidates.length === 0 && (body.place_name || body.name || body.phone_number || body.phone)) {
    candidates = [body as Candidate];
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no candidates found in payload", received_keys: Object.keys(body) },
      { status: 400 },
    );
  }

  const rows = candidates.map((c) => normalize(c, topic, agent));

  const supabase = getServerSupabase();
  const { error } = await supabase.from("googlemaps_candidates").insert(rows);

  if (error) {
    console.error("googlemaps_candidates insert failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "research/agent/callback" });
}
