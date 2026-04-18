/**
 * Inline expandable tool-call card in the transcript.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 2 — Tool calls).
 */
export function ToolCallCard({
  name,
  result,
}: {
  name: string;
  result?: unknown;
}) {
  return (
    <details className="rounded-md border border-border bg-background/50 px-3 py-2 font-mono text-xs">
      <summary className="cursor-pointer">🔧 {name}</summary>
      <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
        {result ? JSON.stringify(result, null, 2) : "(pending)"}
      </pre>
    </details>
  );
}
