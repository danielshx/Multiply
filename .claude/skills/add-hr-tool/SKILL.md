---
name: add-hr-tool
description: Scaffold a new HappyRobot custom-tool endpoint in the Multiply codebase. Creates the route handler at app/api/tools/<name>/route.ts following the project's stub pattern (501 + JSDoc pointer to brain-repo) and prints the JSON tool schema to register in the HR editor. Use when the team decides the agent needs a new function (e.g. check_inventory, get_pricing, transfer_to_human).
---

# add-hr-tool

Scaffold a new HappyRobot custom-tool route in this project.

## When to use

The HR agent needs a new tool (function) it can call. Examples: `check_inventory`, `get_pricing`, `transfer_to_human`, `enrich_contact`, `check_compliance`.

## Steps

1. **Ask the user** for: tool name (snake_case), one-line purpose, input fields (name + type), output fields.

2. **Create the route file** at `app/api/tools/<name>/route.ts` matching the existing pattern:

```ts
import { NextResponse } from "next/server";

/**
 * POST /api/tools/<name> — HR custom tool: <purpose>.
 *
 * Brain-repo: planning/05-happyrobot-workflows.md (Custom tools).
 * Stub.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: "not_implemented", tool: "<name>" },
    { status: 501 },
  );
}
```

3. **Print the HR JSON schema** the user pastes into HR Assets → Tools → Create Tool:

```json
{
  "name": "<name>",
  "description": "<one-sentence purpose for the agent>",
  "endpoint": "POST https://<vercel-url>/api/tools/<name>",
  "parameters": {
    "type": "object",
    "properties": { /* derived from input fields */ },
    "required": [ /* required field names */ ]
  },
  "returns": {
    "type": "object",
    "properties": { /* derived from output fields */ }
  }
}
```

4. **Update `happyrobot/tools/<name>.json`** with the same schema for version control.

5. **Tell the user**: "Now click into HR → Assets → Tools → Create → paste the JSON above. Then add the tool to the relevant workflow node."

## Don't

- Don't implement the body — that's a separate task once the tool's contract is locked.
- Don't add the tool to a workflow yourself — the user clicks that in HR.
- Don't add auth — for the demo, our tool endpoints are public + behind URL obscurity.
