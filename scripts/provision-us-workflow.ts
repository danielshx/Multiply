/**
 * Provisions the HR workflow for /us-outreach (Paid Online Writing Jobs).
 *
 * Creates (or finds) a workflow named "Multiply · US Cold Call", then
 * configures end-to-end:
 *   - Trigger webhook payload schema (phone_number, contact_name, call_id, tracked_quiz_url)
 *   - Prompt node (Alex persona + initial message)
 *   - 2 tools as children of the prompt: record_disposition, send_quiz_link
 *   - Each tool has a POST action child to our /api/tools/us-* endpoints
 *   - Outgoing webhook → /api/us-outreach/webhook (terminal disposition)
 *   - Workflow variables (BASE_URL, AFFILIATE_HOP_ID, NEXT_PUBLIC_DEFAULT_COMMISSION_USD)
 *
 * Usage:
 *   pnpm tsx scripts/provision-us-workflow.ts --discover     # dry, dump current state
 *   pnpm tsx scripts/provision-us-workflow.ts                # create + sync
 *   pnpm tsx scripts/provision-us-workflow.ts --publish      # also publish v1
 *
 * After success: copy the printed workflow ID into HR_US_WORKFLOW_ID env var
 * (Vercel + .env.local), then deploy.
 */

const HR_KEY = process.env.HR_API_KEY;
const APP_URL =
  process.env.MULTIPLY_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://multiply-danielshxs-projects.vercel.app";
const AFFILIATE_HOP_ID =
  process.env.AFFILIATE_HOP_ID ?? "991c2879-98a8-47f9-befe-6eedacf996f2";
const COMMISSION_USD = process.env.NEXT_PUBLIC_DEFAULT_COMMISSION_USD ?? "25";
const WF_NAME = "Multiply · US Cold Call (Paid Online Writing Jobs)";
const BASE = "https://platform.eu.happyrobot.ai/api/v2";

// Same EVENT_POST UUID as existing provision-hr.ts (built-in HR webhook integration)
const EVENT_POST = "01926f2b-2973-7ebf-ada1-e984251e27ec";

if (!HR_KEY) throw new Error("HR_API_KEY is not set");

// Slate rich-text helpers (HR config fields are Slate trees)
const para = (text: string) => [{ type: "paragraph", children: [{ text }] }];
const plainKV = (key: string, value: string) => ({ key, value: para(value) });

type HrNode = {
  id: string;
  type: string;
  name?: string;
  parent_id?: string | null;
  event_id?: string;
  configuration?: Record<string, unknown>;
};

type Workflow = {
  id: string;
  slug: string;
  name: string;
  latest_version: { id: string; version_number: number; is_published: boolean };
};

type Variable = {
  id?: string;
  key: string;
  value_production: string;
  value_staging?: string;
  value_development?: string;
};

const VARIABLES: Variable[] = [
  { key: "BASE_URL", value_production: APP_URL, value_development: "http://localhost:3000" },
  { key: "AFFILIATE_HOP_ID", value_production: AFFILIATE_HOP_ID },
  { key: "COMMISSION_USD", value_production: COMMISSION_USD },
];

async function hr<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${HR_KEY}`,
  };
  if (init.body) baseHeaders["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `HR ${res.status} on ${init.method ?? "GET"} ${path}\n${text.slice(0, 600)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ---------- workflow lookup / creation ----------

async function findOrCreateWorkflow(): Promise<Workflow> {
  // List workflows; HR's list endpoint returns a paged result
  const list = await hr<{ data: Array<Workflow> } | Array<Workflow>>(
    `/workflows?limit=100`,
  );
  const arr = Array.isArray(list) ? list : (list.data ?? []);
  const existing = arr.find((w) => w.name === WF_NAME);
  if (existing) {
    console.log(`  ↻ found existing workflow: ${existing.name} (id=${existing.id.slice(0, 8)})`);
    return existing;
  }

  console.log(`  + creating new workflow from template "voice-agent"...`);
  const created = await hr<{ id: string; slug: string; name: string; latest_version: Workflow["latest_version"] }>(
    `/workflows`,
    {
      method: "POST",
      body: JSON.stringify({
        name: WF_NAME,
        icon: "phone",
        from_template: { template: "voice-agent", inputs: {} },
        variables: VARIABLES.map((v) => ({
          key: v.key,
          value_production: v.value_production,
          value_staging: v.value_staging ?? v.value_production,
          value_development: v.value_development ?? v.value_production,
          is_hidden_in_ui: false,
        })),
        skip_test_all: true,
      }),
    },
  );
  return created as Workflow;
}

// ---------- variable sync (idempotent) ----------

async function listVariables(workflowId: string): Promise<Variable[]> {
  const res = await hr<{ data: Variable[] } | Variable[]>(
    `/workflows/${workflowId}/variables`,
  );
  return Array.isArray(res) ? res : (res.data ?? []);
}

async function upsertVariable(
  workflowId: string,
  existing: Variable[],
  v: Variable,
): Promise<"create" | "update" | "skip"> {
  const found = existing.find((e) => e.key === v.key);
  if (found?.id) {
    if (
      found.value_production === v.value_production &&
      (found.value_development ?? "") === (v.value_development ?? "")
    ) {
      return "skip";
    }
    await hr(`/workflows/${workflowId}/variables/${found.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        value_production: v.value_production,
        value_staging: v.value_staging ?? v.value_production,
        value_development: v.value_development ?? v.value_production,
      }),
    });
    return "update";
  }
  await hr(`/workflows/${workflowId}/variables`, {
    method: "POST",
    body: JSON.stringify({
      key: v.key,
      value_production: v.value_production,
      value_staging: v.value_staging ?? v.value_production,
      value_development: v.value_development ?? v.value_production,
      is_hidden_in_ui: false,
    }),
  });
  return "create";
}

// ---------- outgoing webhook ----------

async function syncOutgoingWebhook(workflowId: string): Promise<string> {
  const url = `${APP_URL}/api/us-outreach/webhook`;
  await hr(`/workflows/${workflowId}`, {
    method: "PATCH",
    body: JSON.stringify({
      settings: { webhooks: [{ url, headers: {} }] },
    }),
  });
  return url;
}

// ---------- nodes ----------

async function listNodes(versionId: string): Promise<HrNode[]> {
  const res = await hr<{ data: HrNode[] }>(`/versions/${versionId}/nodes`);
  return res.data ?? [];
}

async function configureTrigger(versionId: string, nodes: HrNode[]) {
  // The "voice-agent" template returns the trigger as type:"action" with no
  // parent — it's the root of the graph.
  const trigger =
    nodes.find((n) => !n.parent_id && (n.name ?? "").toLowerCase().includes("trigger")) ??
    nodes.find((n) => !n.parent_id);
  if (!trigger) throw new Error("trigger / root node not found");

  await hr(`/versions/${versionId}/nodes/${trigger.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: trigger.type, // "action" or "trigger" — preserve what discovery returned
      event_id: trigger.event_id,
      name: "US cold call trigger",
      configuration: trigger.configuration ?? {},
      webhook_payload: {
        call_id: { type: "string", example: "00000000-0000-0000-0000-000000000000" },
        phone_number: { type: "string", example: "+15555550123" },
        contact_name: { type: "string", example: "Mike" },
        product_name: { type: "string", example: "Paid Online Writing Jobs" },
        product_url: { type: "string", example: "https://paidonlinewritingjobs.com/funnel/job-quiz/job-quiz/" },
        quiz_hop_id: { type: "string", example: AFFILIATE_HOP_ID },
        tracked_quiz_url: { type: "string", example: "https://...?cid=..." },
      },
    }),
  });
  return trigger;
}

async function configurePromptNode(versionId: string, nodes: HrNode[]) {
  const prompt = nodes.find((n) => n.type === "prompt");
  if (!prompt) throw new Error("prompt node not found (template should have created one)");

  const promptMd = `You are **Alex**, a friendly recruiter from the Writers Network.

You're calling people in the US who showed interest in remote writing work. Your goal: get them to take the free 60-second job-fit quiz at paidonlinewritingjobs.com — $1 trial, $47/month after. No experience needed, training included, $25–35/hr typical pay.

# Conversation flow
1. Greet warmly: "Hey @trigger.contact_name, this is Alex from the Writers Network — got a quick second?"
2. If they say yes → mention you saw they're looking for flexible remote work and ask what kind of writing interests them most.
3. If they sound curious → explain: "It's a $1 three-day trial, then $47/month — but you can cancel anytime. The quiz takes 60 seconds and matches you with article writing, blog posts, social media, or live chat work."
4. When they verbally say yes / sound interested in receiving the link → **call the \`send_quiz_link\` tool** with their phone number (default to the call destination). After the SMS is sent, say: "you'll get the link in 5 seconds, take the 60-sec quiz, and see what type of writing fits you."
5. **Always** call \`record_disposition\` before ending the call with the right decision.

# Objection handling
- "Sounds too good to be true / scam" → "Totally fair. That's why it's a $1 three-day trial — zero risk, cancel any time."
- "I'm busy" → "No problem, takes 60 seconds. Want me to text the link so you check it later?"
- "Not interested" → Thank them, exit cleanly, call record_disposition with "not_interested".

# Rules
- Never push past 2 objections.
- Never argue or shame.
- Never promise specific dollar amounts beyond "$25–35/hr typical".
- If they ask anything outside the writing-jobs topic, redirect: "Honestly I'm just here about the writing program — want me to send the quiz link?"`;

  // Prompt field is a Slate tree, not markdown string. Wrap each line as a paragraph.
  const promptSlate = promptMd.split("\n").map((line) => ({
    type: "paragraph",
    children: [{ text: line }],
  }));

  await hr(`/versions/${versionId}/nodes/${prompt.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: "prompt",
      name: "Alex (Writers Network)",
      prompt: promptSlate,
      initial_message: para(
        "Hey @contact_name, this is Alex from the Writers Network — got a quick second?",
      ),
    }),
  });
  return prompt;
}

async function configureVoiceAgent(versionId: string, nodes: HrNode[]) {
  // Try to find the agent action node (the outbound voice agent itself)
  const agent = nodes.find(
    (n) => n.type === "action" && (n.name ?? "").toLowerCase().includes("voice"),
  ) ?? nodes.find((n) => n.type === "agent");
  if (!agent) {
    console.log("  · no voice agent action node found — template may have used a different structure");
    return null;
  }

  await hr(`/versions/${versionId}/nodes/${agent.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: agent.type,
      name: agent.name ?? "US Outbound Voice Agent",
      event_id: agent.event_id,
      configuration: {
        ...(agent.configuration ?? {}),
        // These keys mirror the HR Voice Agent config fields documented in
        // voice-agents/outbound-calls.md. If a field doesn't apply for this
        // template, HR ignores it.
        to: para("@trigger.phone_number"),
        max_call_duration_seconds: 420,
        gracefully_handle_invalid_number: true,
        voicemail_action: "fixed_message",
        voicemail_prompt: para(
          "Hi, this is Alex with the Writers Network — calling about a remote writing opportunity. Give us a call back when you get a sec. Thanks!",
        ),
        recording_enabled: true,
      },
    }),
  });
  return agent;
}

// ---------- tools ----------

type ToolDef = {
  name: string;
  description: string;
  path: string; // /api/tools/...
  parameters: Array<{ name: string; description: string; required?: boolean; example?: string }>;
  bodyFields: Record<string, string>;
  message?: string;
};

const TOOLS: ToolDef[] = [
  {
    name: "record_disposition",
    description:
      "Record the outcome of this call. Call this BEFORE ending the call, every single time — even if the contact hung up or said no. The decision determines the disposition row in our dashboard.",
    path: "/api/tools/us-record-disposition",
    parameters: [
      {
        name: "decision",
        description:
          "One of: closed (sent SMS + verbal yes), interested_no_sms (verbal interest but no SMS), callback (asked to call back later), not_interested (declined).",
        required: true,
        example: "closed",
      },
      { name: "reason", description: "Short reason in their words", example: "wants extra income" },
    ],
    bodyFields: {
      call_id: "@trigger.call_id",
      decision: "@decision",
      reason: "@reason",
    },
    message: "",
  },
  {
    name: "send_quiz_link",
    description:
      "Send the Paid Online Writing Jobs job-fit quiz link via SMS. ONLY call this AFTER the contact has verbally agreed to receive the SMS link. Default phone_number to the call destination.",
    path: "/api/tools/us-send-quiz-link",
    parameters: [
      {
        name: "phone_number",
        description: "E.164 number to text (default to call destination)",
        required: true,
        example: "+15555550123",
      },
    ],
    bodyFields: {
      call_id: "@trigger.call_id",
      phone_number: "@phone_number",
      tracked_url: "@trigger.tracked_quiz_url",
    },
    message: "Sending you the link now — should arrive in five seconds.",
  },
];

async function syncTool(versionId: string, parentNodeId: string, def: ToolDef) {
  const allNodes = await listNodes(versionId);
  const existing = allNodes.find(
    (n) => n.type === "tool" && n.name === def.name,
  );

  let toolId: string;
  if (existing) {
    toolId = existing.id;
  } else {
    const created = await hr<{ data: HrNode[] }>(
      `/versions/${versionId}/nodes`,
      {
        method: "POST",
        body: JSON.stringify({
          nodes: [
            {
              type: "tool",
              name: def.name,
              parent_node_id: parentNodeId,
              configuration: {},
            },
          ],
        }),
      },
    );
    toolId = created.data[0].id;
  }

  await hr(`/versions/${versionId}/nodes/${toolId}`, {
    method: "PUT",
    body: JSON.stringify({
      type: "tool",
      name: def.name,
      function: {
        description: para(def.description),
        parameters: def.parameters.map((p) => ({
          name: p.name,
          description: para(p.description),
          required: p.required ?? false,
          example: p.example ?? "",
        })),
        message: def.message
          ? { type: "fixed", description: para(""), example: def.message }
          : { type: "none", description: para(""), example: "" },
      },
    }),
  });

  // Replace any existing action child with a fresh POST action
  const refreshed = await listNodes(versionId);
  const oldAction = refreshed.find(
    (n) => n.parent_id === toolId && n.type === "action",
  );
  if (oldAction) {
    await hr(`/versions/${versionId}/nodes/${oldAction.id}`, { method: "DELETE" });
  }

  const bodyParams = Object.entries(def.bodyFields).map(([k, v]) => plainKV(k, v));

  await hr(`/versions/${versionId}/nodes`, {
    method: "POST",
    body: JSON.stringify({
      nodes: [
        {
          type: "action",
          name: `POST ${def.path}`,
          parent_node_id: toolId,
          event_id: EVENT_POST,
          configuration: {
            url: para(`${APP_URL}${def.path}`),
            headers: [plainKV("Content-Type", "application/json")],
            params: bodyParams,
            body_mode: "json",
          },
        },
      ],
    }),
  });

  return toolId;
}

// ---------- publish ----------

async function publishVersion(versionId: string) {
  return hr(`/versions/${versionId}/publish`, {
    method: "POST",
    body: JSON.stringify({ environment: "production", force: true }),
  });
}

// ---------- main ----------

async function main() {
  const args = new Set(process.argv.slice(2));
  console.log(`\n▶ Multiply · US-Outreach HR Provisioning\n  app URL: ${APP_URL}\n  workflow name: "${WF_NAME}"\n`);

  // 1. Workflow
  const wf = await findOrCreateWorkflow();
  console.log(`✓ Workflow: ${wf.name} (id=${wf.id})`);
  console.log(`  slug=${wf.slug}  version=${wf.latest_version.version_number}  versionId=${wf.latest_version.id}`);

  // 2. Discovery
  const initialNodes = await listNodes(wf.latest_version.id);
  console.log(`\n▶ Current node graph (${initialNodes.length} nodes):`);
  for (const n of initialNodes) {
    console.log(`  · [${n.type}] ${n.name ?? "(unnamed)"} (id=${n.id.slice(0, 8)}, parent=${n.parent_id?.slice(0, 8) ?? "—"})`);
  }

  if (args.has("--discover")) {
    console.log("\n▶ Full node JSON dump:");
    for (const n of initialNodes) {
      const full = await hr<{ data: HrNode }>(`/versions/${wf.latest_version.id}/nodes/${n.id}`);
      console.log(`\n--- [${n.type}] ${n.name ?? "(unnamed)"} ${n.id} ---`);
      console.log(JSON.stringify(full.data ?? full, null, 2).slice(0, 2000));
    }
    console.log("\n--discover flag set → exiting before mutation\n");
    return;
  }

  // 3. Variables
  console.log("\n▶ Syncing workflow variables...");
  const existingVars = await listVariables(wf.id);
  for (const v of VARIABLES) {
    try {
      const action = await upsertVariable(wf.id, existingVars, v);
      const icon = action === "create" ? "+" : action === "update" ? "~" : "·";
      console.log(`  ${icon} ${v.key}`);
    } catch (err) {
      console.log(`  ✗ ${v.key} — ${(err as Error).message.slice(0, 160)}`);
    }
  }

  // 4. Outgoing webhook
  console.log("\n▶ Configuring outgoing webhook...");
  try {
    const url = await syncOutgoingWebhook(wf.id);
    console.log(`  ✓ webhook → ${url}`);
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  // 5. Prompt node — Alex persona. Voice-agent template defaults (to:@phone_number,
  //    US from-number, voice, max-duration, voicemail) are already correct enough.
  console.log("\n▶ Configuring prompt node (Alex persona)...");
  let promptNode: HrNode | null = null;
  try {
    promptNode = await configurePromptNode(wf.latest_version.id, initialNodes);
    console.log(`  ✓ prompt configured (id=${promptNode.id.slice(0, 8)})`);
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  // 8. Tools — record_disposition + send_quiz_link, attached to prompt node
  if (promptNode) {
    console.log("\n▶ Syncing tools as children of the prompt node...");
    for (const def of TOOLS) {
      try {
        const id = await syncTool(wf.latest_version.id, promptNode.id, def);
        console.log(`  ✓ tool ${def.name} (id=${id.slice(0, 8)})`);
      } catch (err) {
        console.log(`  ✗ tool ${def.name} — ${(err as Error).message.slice(0, 240)}`);
      }
    }
  }

  // 9. Publish
  if (args.has("--publish")) {
    console.log("\n▶ Publishing...");
    try {
      await publishVersion(wf.latest_version.id);
      console.log("  ✓ published to production");
    } catch (err) {
      console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
    }
  } else {
    console.log("\n  (skipping publish — pass --publish to push live)");
  }

  console.log("\n" + "─".repeat(72));
  console.log(`✅ Done.`);
  console.log(`  Workflow ID:  ${wf.id}`);
  console.log(`  Workflow slug: ${wf.slug}`);
  console.log(``);
  console.log(`  Add this to Vercel + .env.local:`);
  console.log(`    HR_US_WORKFLOW_ID=${wf.id}`);
  console.log(``);
  console.log(`  HR editor: https://platform.eu.happyrobot.ai/workflows/${wf.slug}`);
  console.log("─".repeat(72) + "\n");
}

main().catch((err) => {
  console.error("\n✗ provisioning failed:", err.message);
  process.exit(1);
});
