/**
 * Run trace — vertical timeline of HR workflow nodes for one run.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 4 — Run trace).
 */
export default function RunTracePage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="font-mono text-sm text-muted-foreground">
        Run #{params.id}
      </h1>
      <p className="mt-4 text-sm">TODO: RunTimeline + NodeDetailPanel.</p>
    </main>
  );
}
