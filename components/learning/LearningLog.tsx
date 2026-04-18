/**
 * Live-Learning panel — the hero "AI got better mid-pitch" moment.
 *
 * Brain-repo: README.md lines 267–275 (Live-Learning sichtbar),
 * lines 180–186 (pitch beat 2:00–2:30).
 */
export function LearningLog() {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="font-mono text-xs text-muted-foreground">
        📚 live learning log
      </h2>
      {/* TODO: subscribe to learnings table (Supabase + Twin) */}
      <ul className="mt-3 space-y-2 font-mono text-xs">
        <li className="text-muted-foreground">no learnings yet</li>
      </ul>
    </section>
  );
}
