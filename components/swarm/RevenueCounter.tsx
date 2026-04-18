/**
 * Big € pipeline-value counter. VC juror brain-hack.
 *
 * Brain-repo: README.md lines 296–300 (Revenue-Impact-Counter).
 */
export function RevenueCounter() {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-2 text-right">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Pipeline Value
      </div>
      <div className="font-mono text-2xl">€0</div>
    </div>
  );
}
