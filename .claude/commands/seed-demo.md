---
description: Generate or refresh the full demo dataset (25 leads + 5 personas + product profile + research snippets + starter learnings)
---

Spawn the `demo-data-seeder` agent. Brief it with: "Generate a complete demo dataset for Multiply. Read lib/personas/liveSwarm.ts and supabase/schema.sql first. Output to supabase/seed.sql, scripts/seed-leads.ts, scripts/research-snippets.json, scripts/learnings-prebake.json. Mix industries, mix titles, EU/DACH bias, plausible signal score distribution. No real people."

After it finishes, run `git diff --stat` and report what changed.
