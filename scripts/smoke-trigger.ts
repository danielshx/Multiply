/**
 * One-shot HR /hooks call — verifies HR_API_KEY + HR_WORKFLOW_SLUG work.
 *
 * Run with: npx tsx scripts/smoke-trigger.ts
 */
async function main() {
  const slug = process.env.HR_WORKFLOW_SLUG;
  const hooksUrl =
    process.env.HR_HOOKS_URL ?? "https://platform.eu.happyrobot.ai/hooks";
  if (!slug) {
    console.error("HR_WORKFLOW_SLUG not set");
    process.exit(1);
  }

  const res = await fetch(`${hooksUrl}/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_id: "smoke-test",
      customer_name: "Smoke Test",
    }),
  });

  console.log(res.status, await res.text());
}

main();
