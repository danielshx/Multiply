/**
 * HappyRobot type stubs. Refine against actual webhook payloads.
 *
 * Brain-repo: reference/api-cheatsheet.md, docs/happyrobot/api-reference/.
 */

export type AgentMode = "cold" | "warm" | "hot" | "handoff";

export type HRWebhookEvent =
  | { type: "run.completed"; run: HRRun; variables?: Record<string, unknown> }
  | { type: "run.failed"; run: HRRun; error?: string }
  | { type: "message.created"; message: HRMessage; session: HRSession }
  | { type: "contact.updated"; contact: HRContact };

export interface HRRun {
  id: string;
  workflow_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  ended_at?: string;
  output?: Record<string, unknown>;
}

export interface HRSession {
  id: string;
  run_id: string;
  channel: "voice" | "sms" | "email" | "chat";
}

export interface HRMessage {
  id: string;
  session_id: string;
  role: "agent" | "user" | "system" | "tool" | "human";
  content: string;
  ts: string;
}

export interface HRContact {
  id: string;
  phone?: string;
  email?: string;
  memories?: { key: string; value: string }[];
}

export interface TriggerWorkflowPayload {
  lead_id: string;
  phone_number?: string;
  email?: string;
  customer_name?: string;
  product_profile_id?: string;
  [key: string]: unknown;
}
