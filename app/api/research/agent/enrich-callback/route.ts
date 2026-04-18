import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/research/agent/enrich-callback
 *
 * Called once per place from inside the HappyRobot "Research: Google Maps"
 * workflow's enrichment loop. Each loop iteration fetches the place's
 * website, runs an AI Extract for contacts + a refined description, then
 * POSTs the result here. We UPDATE the candidate row matching
 * (agent_name, google_place_id) so the Research tab streams enrichment in
 * via Supabase Realtime UPDATE events.
 *
 * Accepted payload shapes (tolerant to how HR formats the fields):
 *   {
 *     agent: string,
 *     search_query?: string,
 *     google_place_id: string,
 *     place_name?: string,
 *     website?: string,
 *     contacts: array | string (JSON),
 *     contacts_json?: string,
 *     website_summary?: string,
 *     enrichment_error?: string
 *   }
 */

type Contact = {
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
};

function parseContacts(v: unknown): Contact[] {
  let raw: unknown = v;
  if (typeof raw === "string" && raw.trim()) {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    try {
      raw = JSON.parse(cleaned);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: Contact[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : null;
    if (!name) continue;
    out.push({
      name,
      role: typeof r.role === "string" && r.role.trim() ? r.role.trim() : null,
      phone: typeof r.phone === "string" && r.phone.trim() ? r.phone.trim() : null,
      email: typeof r.email === "string" && r.email.trim() ? r.email.trim() : null,
    });
  }
  return out;
}

function pickString(body: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const agent = pickString(body, "agent", "agent_name");
  const placeId = pickString(body, "google_place_id", "place_id");
  const placeName = pickString(body, "place_name", "name");
  const searchQuery = pickString(body, "search_query");
  const websiteSummary = pickString(body, "website_summary", "summary");
  const enrichmentError = pickString(body, "enrichment_error", "error");

  const contacts = parseContacts(body.contacts ?? body.contacts_json);

  if (!agent || (!placeId && !placeName)) {
    return NextResponse.json({
      ok: false,
      reason: "agent and google_place_id (or place_name) are required",
      received_keys: Object.keys(body),
    });
  }

  const supabase = getServerSupabase();

  let query = supabase
    .from("googlemaps_candidates")
    .select("id")
    .eq("agent_name", agent)
    .order("created_at", { ascending: false })
    .limit(1);

  if (placeId) {
    query = query.eq("google_place_id", placeId);
  } else if (placeName) {
    query = query.eq("place_name", placeName);
  }
  if (searchQuery) {
    query = query.eq("search_query", searchQuery);
  }

  const { data: match, error: findErr } = await query.maybeSingle();

  if (findErr || !match) {
    console.error("[enrich-callback] no matching row", {
      agent,
      placeId,
      placeName,
      searchQuery,
      findErr,
    });
    return NextResponse.json({
      ok: false,
      reason: "no matching candidate row",
      agent,
      google_place_id: placeId,
      place_name: placeName,
    });
  }

  const hasContent = contacts.length > 0 || websiteSummary;
  const nextStatus = enrichmentError
    ? "failed"
    : hasContent
      ? "enriched"
      : "skipped";

  const { error: updErr } = await supabase
    .from("googlemaps_candidates")
    .update({
      contacts,
      website_summary: websiteSummary,
      enrichment_status: nextStatus,
      enrichment_error: enrichmentError,
      enriched_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  if (updErr) {
    console.error("[enrich-callback] update failed", { id: match.id, updErr });
    return NextResponse.json({
      ok: false,
      id: match.id,
      error: updErr.message,
    });
  }

  return NextResponse.json({
    ok: true,
    id: match.id,
    contacts_count: contacts.length,
    status: nextStatus,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "research/agent/enrich-callback" });
}
