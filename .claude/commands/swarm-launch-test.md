---
description: Smoke-test the swarm launch end-to-end — trigger 5 parallel HR runs, wait for tile updates, report timing per persona
---

Run `npx tsx scripts/smoke-trigger.ts` 5 times in parallel (one per Live Swarm persona) and tail the next.js dev server logs. Report:

- Which `/hooks/{slug}` calls returned 200
- Which Supabase tile rows updated within 5s
- End-to-end latency per persona (HTTP → first webhook → first tile UPDATE)
- Any 4xx/5xx from HR

Then suggest a fix for any persona that took > 8s end-to-end (the pitch budgets ~8s total launch latency).
