import { NextResponse } from "next/server";

/**
 * POST /api/research/agent
 * Kicks off the HappyRobot Research Agent webhook.
 * Body: { topic: string, agent: string }
 * HR posts the enriched Google Maps results back to /api/research/agent/callback.
 */
const HR_HOOK_URL =
  process.env.HR_RESEARCH_AGENT_HOOK_URL ??
  "https://workflows.platform.eu.happyrobot.ai/hooks/a7obz47xa3za";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const topic = (body.topic as string | undefined)?.trim();
  const agent = (body.agent as string | undefined)?.trim();

  if (!topic || !agent) {
    return NextResponse.json(
      { error: "topic and agent are required" },
      { status: 400 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://multiply-git-main-danielshxs-projects.vercel.app";
  const callbackUrl = `${appUrl}/api/research/agent/callback`;

  const hrRes = await fetch(HR_HOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, agent, callback_url: callbackUrl }),
  });

  if (!hrRes.ok) {
    const detail = await hrRes.text().catch(() => "");
    return NextResponse.json(
      { error: "HR webhook failed", status: hrRes.status, detail },
      { status: 502 },
    );
  }

  const raw = await hrRes.text().catch(() => "");
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  return NextResponse.json({
    ok: true,
    topic,
    agent,
    callback_url: callbackUrl,
    hr_response: payload,
  });
}
