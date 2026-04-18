---
name: wire-hr-flow
description: End-to-end wiring guide for connecting an HR webhook event to the dashboard — webhook receiver → Supabase write → Realtime push → UI update. Use when implementing a new HR event type, debugging "why doesn't the tile update", or onboarding a new dev to the data flow.
---

# wire-hr-flow

Wire one HR event from webhook → DB → UI.

## The 5-step flow

For any new HR event type (e.g. `mode.changed`, `learning.created`, `signal.detected`):

### 1. Define the event payload type

Add to `lib/happyrobot/types.ts`:

```ts
export interface HRModeChangedEvent {
  type: "mode.changed";
  session_id: string;
  lead_id: string;
  from: AgentMode;
  to: AgentMode;
  reason: string;
}
```

Add the new variant to the `HRWebhookEvent` union.

### 2. Handle it in the webhook receiver

In `app/api/hr-webhook/route.ts`:

```ts
case "mode.changed":
  await supabase
    .from("agent_tiles")
    .update({ mode: event.to, updated_at: new Date().toISOString() })
    .eq("lead_id", event.lead_id);
  break;
```

### 3. Verify the table column exists

Check `supabase/schema.sql`. If missing, add it AND write a migration note in the file header.

### 4. Verify Realtime is enabled

Supabase dashboard → Database → Replication → ensure the table is in `supabase_realtime`. Document this in `supabase/schema.sql` as a comment.

### 5. Subscribe in the UI

In the relevant component (e.g. `components/swarm/AgentTile.tsx`):

```ts
useEffect(() => {
  const sb = getBrowserSupabase();
  const ch = sb
    .channel(`agent-tile-${leadId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "agent_tiles", filter: `lead_id=eq.${leadId}` },
      (payload) => onUpdate(payload.new),
    )
    .subscribe();
  return () => { sb.removeChannel(ch); };
}, [leadId]);
```

## Common debugging

| Symptom | Likely cause |
|---|---|
| Webhook 401 | `WEBHOOK_SECRET` mismatch with HR config |
| Row updates but UI doesn't | Realtime not enabled for that table |
| UI updates but tile flickers | Subscribing on every render — wrap in `useEffect` with stable deps |
| Latency > 500ms tile-to-UI | Check if you're proxying through too many serverless cold starts; consider Edge runtime for the webhook |
