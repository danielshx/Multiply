---
name: pre-pitch-checklist
description: Run the final pre-pitch verification checklist for the Multiply Live Swarm demo. Use 60 minutes before the actual pitch and the night before. Verifies HR workflow status, Supabase Realtime, Vercel deploy, env vars, persona phones, backup video, dashboard polish, KPI seed values, and rehearsal counter.
---

# pre-pitch-checklist

Final verification — run 60 min before pitch and the night before.

## Hard gates (any failure = stop pitch and fix)

### Infrastructure
- [ ] Vercel deploy: latest commit on `main` is **Ready** (not Building, not Error). `vercel inspect <url>`.
- [ ] HR workflow `019d9cb9-...` (or current) has **0 issues** in the scanner.
- [ ] HR Twin DB table `workflow_dump` is receiving rows (sanity-query it).
- [ ] Supabase `leads`, `agent_tiles`, `learnings`, `messages` are in `supabase_realtime` publication.
- [ ] `npm run typecheck` passes locally on `main`.
- [ ] `npm run build` passes locally.

### Demo data
- [ ] 5 Live Swarm persona rows exist in `leads` with `metadata.live_swarm = true`.
- [ ] 20 generic leads exist for the 25-tile grid.
- [ ] At least 3 starter Learnings in `learnings` so the Learning-Log isn't empty on demo open.
- [ ] Revenue counter shows a non-zero starting value if we want the wow tick-up.

### Pitch logistics
- [ ] All 5 team members confirmed for the time slot.
- [ ] Each persona-actor has their persona script printed/visible.
- [ ] All 5 phones have signal at the venue (test on stage if possible).
- [ ] **Plan B**: browser-voice-token fallback works without WiFi (test offline).
- [ ] **Plan C**: backup video on presenter's laptop, opens in <5s.
- [ ] Dashboard is **fullscreen** on the presenter laptop, mouse path rehearsed.
- [ ] No browser tabs open beyond the demo.
- [ ] Notifications silenced (Slack, Mail, iMessage, system updates).

### Demo flow rehearsal
- [ ] Pitch run-through completed at least 5x with stopwatch.
- [ ] Each beat hits its time budget ±10% (see `../HappyRobot-TumAI/README.md` lines 149–196).
- [ ] Takeover modal works: presenter types "Hi Dana, ..." → Dana hears it.
- [ ] Live-Learning panel updates visibly when Berit objects.
- [ ] Ethics badges visible on every tile.
- [ ] Interactive Jury Moment input field is enabled and pre-baked objections are loaded.

## Soft gates (degrades wow, but won't kill demo)

- [ ] Voice variety: at least 3 distinct voices across the 5 personas.
- [ ] Multilingual: at least 1 persona in DE, 1 in EN, 1 in ES (or DE + EN).
- [ ] KPI counters animate (not just plain numbers).
- [ ] Pulse-ring animates on HOT-mode tiles.

## Output

Print a Markdown table: `[Gate] | [Status: ✅ / ❌ / ⚠] | [Note / Fix command]`.

End with: **"Demo ready: GO / NO-GO — <one-line reason>"**

## Sources of truth

- `../HappyRobot-TumAI/README.md` lines 198–238 — tech requirements
- `../HappyRobot-TumAI/README.md` lines 220–229 — risks + mitigations
- `../HappyRobot-TumAI/README.md` lines 329–335 — non-feature essentials
