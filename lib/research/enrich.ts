import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Website enrichment: fetch the place's website, extract contacts and a
 * refined business description via OpenAI, then UPDATE the candidate row.
 *
 * Runs server-side after the HR callback inserts raw Google Maps rows. The
 * dashboard subscribes to UPDATE events so the extracted contacts stream in
 * progressively per row.
 */

type Contact = {
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 600_000;
const MAX_TEXT_CHARS = 16_000;
const OPENAI_MODEL = "gpt-4o-mini";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(u: string): string | null {
  const trimmed = u.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MultiplyResearchBot/1.0; +https://multiply.ai)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const text = stripHtml(html);
    return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
  } finally {
    clearTimeout(timer);
  }
}

type Extraction = {
  website_summary: string | null;
  contacts: Contact[];
};

async function extractViaOpenAI(params: {
  text: string;
  placeName: string | null;
  website: string;
}): Promise<Extraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const systemPrompt =
    "You are a precise web-page information extractor. Only extract facts that appear verbatim on the provided page text. Never invent names, roles, phone numbers, or emails. If a field is absent, return null for that field. If no contacts are listed, return an empty array.";

  const userPrompt = [
    `Place: ${params.placeName ?? "(unknown)"}`,
    `Website: ${params.website}`,
    "",
    "Extract:",
    "1. website_summary — one or two sentences describing what this business actually does, based on the page. Be specific and concrete. If the page content is too sparse to summarise, return null.",
    "2. contacts — an array of people explicitly identified on the page (typically on about/team/contact pages). For each: name, role (their job title at the company), phone (E.164-ish if possible), email. Include a person only if a name is present. Omit generic mailboxes like info@ or sales@ unless they are associated with a named person.",
    "",
    "Return valid JSON matching this shape:",
    '{"website_summary": string|null, "contacts": [{"name": string, "role": string|null, "phone": string|null, "email": string|null}]}',
    "",
    "Page text:",
    "---",
    params.text,
    "---",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  return coerceExtraction(parsed);
}

function coerceExtraction(v: unknown): Extraction {
  if (!v || typeof v !== "object") return { website_summary: null, contacts: [] };
  const o = v as Record<string, unknown>;
  const website_summary =
    typeof o.website_summary === "string" && o.website_summary.trim()
      ? o.website_summary.trim()
      : null;
  const rawContacts = Array.isArray(o.contacts) ? o.contacts : [];
  const contacts: Contact[] = [];
  for (const c of rawContacts) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : null;
    if (!name) continue;
    contacts.push({
      name,
      role: typeof r.role === "string" && r.role.trim() ? r.role.trim() : null,
      phone: typeof r.phone === "string" && r.phone.trim() ? r.phone.trim() : null,
      email: typeof r.email === "string" && r.email.trim() ? r.email.trim() : null,
    });
  }
  return { website_summary, contacts };
}

export async function enrichCandidate(id: string): Promise<void> {
  const supabase = getServerSupabase();

  const { data: row, error: readErr } = await supabase
    .from("googlemaps_candidates")
    .select("id, website, place_name, enrichment_status")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !row) {
    console.error("[enrichCandidate] row missing", { id, readErr });
    return;
  }

  const url = row.website ? normalizeUrl(row.website) : null;
  if (!url) {
    await supabase
      .from("googlemaps_candidates")
      .update({
        enrichment_status: "skipped",
        enrichment_error: "no website",
        enriched_at: new Date().toISOString(),
      })
      .eq("id", id);
    return;
  }

  if (row.enrichment_status === "enriching" || row.enrichment_status === "enriched") {
    return;
  }

  await supabase
    .from("googlemaps_candidates")
    .update({ enrichment_status: "enriching" })
    .eq("id", id);

  try {
    const text = await fetchWebsiteText(url);
    if (!text || text.length < 60) {
      throw new Error("website content too small");
    }
    const extraction = await extractViaOpenAI({
      text,
      placeName: row.place_name ?? null,
      website: url,
    });

    await supabase
      .from("googlemaps_candidates")
      .update({
        website_summary: extraction.website_summary,
        contacts: extraction.contacts,
        enrichment_status: "enriched",
        enrichment_error: null,
        enriched_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[enrichCandidate] failed", { id, url, message });
    await supabase
      .from("googlemaps_candidates")
      .update({
        enrichment_status: "failed",
        enrichment_error: message.slice(0, 500),
        enriched_at: new Date().toISOString(),
      })
      .eq("id", id);
  }
}
