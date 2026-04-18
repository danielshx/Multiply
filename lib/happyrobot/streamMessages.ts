/**
 * SSE proxy helper for /sessions/{id}/messages/stream.
 *
 * Brain-repo: reference/api-cheatsheet.md ("Live stream"),
 * docs/happyrobot/api-reference/sessions/stream-session-messages-sse.md.
 * Stub.
 */
export async function openMessageStream(sessionId: string): Promise<Response> {
  const baseUrl =
    process.env.HR_BASE_URL ?? "https://api.eu.happyrobot.ai/v2";
  const key = process.env.HR_API_KEY;
  if (!key) throw new Error("HR_API_KEY is not set");

  return fetch(`${baseUrl}/sessions/${sessionId}/messages/stream`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "text/event-stream",
    },
  });
}
