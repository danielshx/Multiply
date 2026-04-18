/**
 * Landing — entry point for product-profile + lead-list upload.
 *
 * Brain-repo: README.md lines 45–52 (demo flow, "Setup (20s)").
 * Stub. Actual implementation comes in the next pass.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Multiply</h1>
      <p className="font-mono text-sm text-muted-foreground">
        Swarm Outreach Engine — skeleton.
      </p>
      <a
        href="/dashboard"
        className="rounded-md border border-border px-4 py-2 font-mono text-sm hover:bg-card"
      >
        → /dashboard
      </a>
    </main>
  );
}
