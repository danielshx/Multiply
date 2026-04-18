import { getServerSupabase } from "@/lib/supabase/server";
import { LiveBoard, type Lead, type Message } from "./LiveBoard";

export const dynamic = "force-dynamic";

/**
 * GET /live — server-rendered initial snapshot of leads + their last 30
 * messages, then handed to the client component which subscribes to
 * Supabase Realtime and prepends new rows in real time.
 */
export default async function LivePage() {
  const supabase = getServerSupabase();
  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("*")
    .order("ts", { ascending: false })
    .limit(500);

  if (leadsErr || msgErr) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
        <h1 className="text-2xl font-semibold mb-4">Live · error</h1>
        <pre className="text-sm text-red-400">
          {leadsErr?.message || msgErr?.message || "unknown"}
        </pre>
        <p className="text-sm text-neutral-400 mt-4">
          Make sure Supabase env vars are set in <code>.env.local</code> and the
          tables <code>leads</code> + <code>messages</code> exist.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div>
          <h1 className="text-lg font-semibold">Multiply · Live</h1>
          <p className="text-xs text-neutral-400 mono">
            Real-time agent activity per lead
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-neutral-400 mono uppercase tracking-wide">
            connected
          </span>
        </div>
      </header>
      <LiveBoard
        initialLeads={(leads ?? []) as Lead[]}
        initialMessages={(messages ?? []) as Message[]}
      />
    </main>
  );
}
