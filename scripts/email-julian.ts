/**
 * One-shot: send the Multiply intro email to Julian.
 * Hits the same /api/watcher/trigger-email endpoint the Watcher uses.
 *
 *   pnpm tsx scripts/email-julian.ts
 *
 * Requires GMAIL_APP_PASSWORD in .env.local. Without it the endpoint falls
 * back to STUB mode and you'll see sent=false in the output.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const julian = {
  name: "Julian Hähle",
  company: "HappyRobot",
  email: "julian.haehle@gmail.com",
  customer_goal: "Give technical feedback on Multiply (reviewer perspective)",
  current_time: new Date().toISOString(),
  reason: "manual one-shot via scripts/email-julian.ts",
};

(async () => {
  console.log(`→ POST ${APP_URL}/api/watcher/trigger-email  to=${julian.email}`);
  const res = await fetch(`${APP_URL}/api/watcher/trigger-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(julian),
    cache: "no-store",
  });
  const text = await res.text();
  console.log(`status=${res.status}`);
  console.log(text);
  if (!res.ok) process.exit(1);
})();

function loadDotEnvLocal(): void {
  try {
    const path = resolve(process.cwd(), ".env.local");
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i < 1) continue;
      const k = trimmed.slice(0, i).trim();
      const v = trimmed.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // best-effort
  }
}
