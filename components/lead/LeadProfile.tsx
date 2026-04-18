/**
 * Right-rail lead profile: phone/email/interest/score/extracted/memories.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 2 — LeadProfile sidebar).
 */
export function LeadProfile({ leadId }: { leadId: string }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="font-mono text-xs text-muted-foreground">
        lead profile · {leadId}
      </h2>
      {/* TODO: load from supabase + HR contact */}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">phone</dt>
          <dd className="font-mono">—</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">stage</dt>
          <dd className="font-mono">new</dd>
        </div>
      </dl>
    </section>
  );
}
