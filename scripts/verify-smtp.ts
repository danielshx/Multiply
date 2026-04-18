/**
 * Isolated SMTP credential check. Doesn't touch the dev server or Next.js.
 * Just tries to log in to Gmail SMTP with EMAIL_AGENT_FROM + GMAIL_APP_PASSWORD
 * and reports the verbose result.
 *
 *   pnpm tsx scripts/verify-smtp.ts
 */
import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnvLocal();

const user = process.env.EMAIL_AGENT_FROM ?? "happymultiply@gmail.com";
const passRaw = process.env.GMAIL_APP_PASSWORD ?? "";
const pass = passRaw.replace(/\s+/g, "");

console.log(`user: ${JSON.stringify(user)}`);
console.log(`pass length (no spaces): ${pass.length}  (expected 16)`);
console.log(`pass char codes: [${[...pass].map((c) => c.charCodeAt(0)).join(", ")}]`);

if (!user) {
  console.error("EMAIL_AGENT_FROM not set");
  process.exit(2);
}
if (pass.length !== 16) {
  console.error("App password is not 16 characters after stripping spaces.");
  process.exit(2);
}

const t = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user, pass },
  logger: true,
  debug: true,
});

(async () => {
  try {
    const ok = await t.verify();
    console.log(`\nVERIFY OK: ${ok}`);
  } catch (err) {
    console.error(`\nVERIFY FAILED: ${(err as Error).message}`);
    process.exit(1);
  }
})();

function loadDotEnvLocal(): void {
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
}
