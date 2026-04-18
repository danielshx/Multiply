# CLAUDE.md — project guide

## What this repo is

**Multiply** is the product for HappyRobot × TUM.ai, **Idea 1: Swarm Outreach Engine**. 25 personalized AI sales agents in parallel, hero demo = the "Live Swarm" calling 5 team members live during the pitch.

This repo holds **only product code**. The planning brain (ideas, scoring, demo script, HR architecture, workflow blueprints, UI specs, 302-page HR docs mirror) lives at `../HappyRobot-TumAI/`. Always read the brain repo before designing anything new — most decisions are already made there.

## Where to look first

| Need | Open |
|---|---|
| What we're building | `../HappyRobot-TumAI/README.md` lines 30–240 |
| System architecture, data flows, env vars | `../HappyRobot-TumAI/planning/03-architecture.md` |
| Stack choices | `../HappyRobot-TumAI/planning/04-tech-stack.md` |
| HR workflows (node-by-node) | `../HappyRobot-TumAI/planning/05-happyrobot-workflows.md` |
| UI screens | `../HappyRobot-TumAI/planning/06-ui-screens.md` |
| HR API cheatsheet | `../HappyRobot-TumAI/reference/api-cheatsheet.md` |
| HR docs mirror (302 pages) | `../HappyRobot-TumAI/docs/happyrobot/` |

## Plan

Skeleton plan: `~/.claude/plans/ich-habe-hier-ein-quiet-pebble.md`. Read it before adding files — it lists every directory + decision.

## Project subagents (`.claude/agents/`)

Spawn via the Agent tool with `subagent_type=<name>`:

- **`hr-architect`** — designs HR workflow node-graphs + custom-tool specs. Outputs paste-ready specs for the HR editor. Read-only.
- **`swarm-tile-designer`** — UI polish for the Swarm dashboard, Bloomberg-terminal feel, framer-motion mode-flips, 25-tile render perf.
- **`persona-writer`** — writes/refines the 5 Live Swarm persona scripts (backstory, opener, beats, trigger words, expected agent behavior).
- **`pitch-rehearser`** — second-by-second audit of the demo path against the pitch script. Returns a punch list + GO/NO-GO. Read-only.
- **`demo-data-seeder`** — generates believable seed data (25 leads, research snippets, starter Learnings). EU/DACH bias, mixed industries.

## Project skills (`.claude/skills/`)

Project-local skills (work in this repo only):

- **`add-hr-tool`** — scaffold a new HR custom-tool route + print HR JSON schema to register
- **`add-api-route`** — scaffold a new Next.js API route in project pattern (Zod, JSDoc, brain-repo pointer)
- **`wire-hr-flow`** — end-to-end guide: HR webhook → Supabase → Realtime → UI
- **`pre-pitch-checklist`** — 60-min-before-pitch verification gates

Also installed from the open ecosystem (`npx skills add bernieweb3/hackathon-ai-devkit@*`):

- **`hackathon-pitchdeck`** — generate the pitch deck
- **`hackathon-judge-simulator`** — rehearse jury Q&A
- **`hackathon-demo-video`** — script a backup demo video
- **`hackathon-deployment-prep`** — pre-deploy hardening
- **`hackathon-risk-analyzer`** — surface demo-day risks

## Slash commands (`.claude/commands/`)

- **`/pitch-rehearse`** — spawn pitch-rehearser, return punch list
- **`/pre-pitch`** — run the full pre-pitch checklist
- **`/swarm-launch-test`** — smoke-test 5 parallel HR runs end-to-end
- **`/seed-demo`** — generate or refresh the demo dataset
- **`/hr-design <purpose>`** — spawn hr-architect to design a workflow

## Global skills to lean on

- `nextjs-app-router-patterns`, `nextjs-react-typescript` — Next.js + RSC
- `supabase-backend-platform` — DB + Realtime
- `tailwind-css`, `tailwindcss-advanced-layouts`, `shadcn-ui` — UI
- `react-hook-form-zod` — forms
- `framer-motion-animator` — tile animations
- `data-visualization` — signal graphs, revenue counter
- `state-management` — Zustand for swarm tile state
- `typescript-best-practices`, `typescript-advanced-types` — HR payload types
- `react-performance-optimization` — keep 25 live tiles smooth
- `webapp-testing` — Playwright smoke before pitch
- `deploy-to-vercel` / `vercel-deploy` — preview deploys
- `simplify`, `code-quality` — pre-pitch cleanup
- `webapp-testing` — Playwright smoke against demo path
- `find-skills` — discover more skills if a gap appears

## MCPs in this session

- **Vercel** — deploys + runtime logs
- **Google Calendar** — `book-meeting` tool target during the demo
- **Gmail** — only if email channel ships
- **Granola** — pull team meeting transcripts when needed

Skipped: Linear, Cloudflare, Drive.

## Conventions

- **TypeScript strict.** Never `any`.
- **Server-only secrets** stay in route handlers / server components — never imported from client components.
- **All HR calls** go through `lib/happyrobot/client.ts`. Don't `fetch()` HR directly elsewhere.
- **All Supabase access** goes through `lib/supabase/{client,server}.ts`.
- **Stubs return `501 Not Implemented`** with a JSDoc pointer to the brain-repo section that defines the behavior.
- **Dark mode default.** Monospace for IDs / data fields.
- **No comments** unless WHY is non-obvious.

## Do not build

- Auth (single-user demo)
- Mobile responsive (jury looks at a laptop)
- Light mode toggle
- Onboarding flow
- Microservices / separate backends
- Our own LLM orchestration (HR does it)
- Our own telephony (HR proxies Twilio)
