---
name: add-api-route
description: Scaffold a new Next.js API route in the Multiply codebase following the project pattern (TypeScript, NextResponse, JSDoc pointer to brain-repo, 501 stub or real implementation). Use when adding any new endpoint outside app/api/tools/* (those use add-hr-tool instead).
---

# add-api-route

Scaffold a new Next.js App Router API route.

## When to use

Need a new endpoint at `/api/<path>`. NOT for HR custom tools — those use the `add-hr-tool` skill.

## Steps

1. **Ask** for: HTTP method, path (with dynamic segments if any), purpose, request shape, response shape, whether it's a stub or full impl.

2. **Decide directory** based on path: `app/api/<segments>/route.ts`. Dynamic segments use `[bracket]` folders, e.g. `/api/leads/[id]` → `app/api/leads/[id]/route.ts`.

3. **Write the file** matching project conventions:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  /* fields */
});

/**
 * <METHOD> /api/<path> — <purpose>.
 *
 * Brain-repo: planning/03-architecture.md or relevant doc.
 */
export async function <METHOD>(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  // TODO: implementation
  return NextResponse.json(
    { error: "not_implemented" },
    { status: 501 },
  );
}
```

4. **Conventions to enforce**:
   - All HR calls go through `lib/happyrobot/*` — never `fetch()` HR directly.
   - All Supabase calls in route handlers use `getServerSupabase()` from `lib/supabase/server.ts`.
   - Webhook receivers MUST verify `WEBHOOK_SECRET` before doing work.
   - Always validate the body with Zod.
   - JSDoc comment must cite a brain-repo file path.

5. **If route reads/writes Supabase**: add the table + columns it touches to `supabase/schema.sql` if missing.
