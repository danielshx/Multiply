"use client";

/**
 * Takeover modal — manager types a message → POSTs to /api/takeover/[sessionId].
 * Agent pauses; from this point onward bubbles render grey.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 6 — Takeover modal),
 * planning/03-architecture.md (Flow D).
 */
export function TakeoverModal({ leadId }: { leadId: string }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="font-mono text-xs text-muted-foreground">
        takeover · {leadId}
      </h2>
      {/* TODO: react-hook-form + zod schema */}
      <button
        type="button"
        className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-background/50"
        disabled
      >
        Take over
      </button>
    </section>
  );
}
