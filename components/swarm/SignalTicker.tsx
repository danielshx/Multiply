/**
 * Bloomberg-style horizontal ticker of incoming signals.
 *
 * Brain-repo: README.md lines 286–294 (Bloomberg-terminal polish),
 * planning/06-ui-screens.md.
 */
export function SignalTicker() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
      {/* TODO: live-stream signals from SwarmStore */}
      ─── signal stream offline ───
    </div>
  );
}
