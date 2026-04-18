/**
 * MindLens AI Personality Insight — universal 60-second quiz offer.
 * Uses 16personalities free test as the destination URL. No affiliate
 * tracking required; we carry cid=call_id purely for our own analytics.
 */
const QUIZ_URL =
  process.env.QUIZ_URL ?? "https://www.16personalities.com/free-personality-test";

export const AFFILIATE = {
  productName: "MindLens AI Personality Insight",
  brandName: "MindLens",
  productUrl: QUIZ_URL,
  hopId: "mindlens",
  hopParam: "cid",
  defaultCommissionUsd: 0,
} as const;

/**
 * Build a URL for the destination quiz, tagged with call_id so we can trace
 * which call drove a given click in our own Supabase logs.
 */
export function buildTrackedQuizUrl(callId: string): string {
  try {
    const u = new URL(AFFILIATE.productUrl);
    u.searchParams.set("ref", "mindlens");
    u.searchParams.set("cid", callId);
    return u.toString();
  } catch {
    return AFFILIATE.productUrl;
  }
}
