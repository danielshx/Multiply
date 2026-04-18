/**
 * HappyRobot REST client (server-only). Wraps fetch with auth + EU base URL.
 *
 * Brain-repo: reference/api-cheatsheet.md.
 * Stub — fill in retry/error handling in implementation pass.
 */

const HR_BASE_URL = process.env.HR_BASE_URL ?? "https://api.eu.happyrobot.ai/v2";

function authHeaders(): HeadersInit {
  const key = process.env.HR_API_KEY;
  if (!key) throw new Error("HR_API_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function hrFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${HR_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`HR ${res.status} ${res.statusText} on ${path}`);
  }
  return (await res.json()) as T;
}

export const HR = { fetch: hrFetch };
