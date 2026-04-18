"use client";

/**
 * Live transcript pane — consumes /api/stream/[sessionId] via EventSource.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 2 — Conversation feed).
 */
export function LiveTranscript({ leadId }: { leadId: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
      <header className="font-mono text-xs text-muted-foreground">
        live transcript · lead {leadId}
      </header>
      {/* TODO: SSE consumer + MessageBubble list */}
      <div className="h-96 rounded bg-background/50" />
    </section>
  );
}
