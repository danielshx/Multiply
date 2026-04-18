import type { TriggerWorkflowPayload } from "./types";

/**
 * Trigger an HR workflow via /hooks/{slug}.
 *
 * Brain-repo: reference/api-cheatsheet.md ("Trigger a workflow").
 * Stub.
 */
export async function triggerWorkflow(
  payload: TriggerWorkflowPayload,
): Promise<{ run_id?: string }> {
  const slug = process.env.HR_WORKFLOW_SLUG;
  const hooksUrl =
    process.env.HR_HOOKS_URL ?? "https://platform.eu.happyrobot.ai/hooks";
  if (!slug) throw new Error("HR_WORKFLOW_SLUG is not set");

  const key = process.env.HR_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(`${hooksUrl}/${slug}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HR hook failed: ${res.status}`);
  return res.json();
}
