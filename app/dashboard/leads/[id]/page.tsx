import { LiveTranscript } from "@/components/lead/LiveTranscript";
import { LeadProfile } from "@/components/lead/LeadProfile";
import { TakeoverModal } from "@/components/lead/TakeoverModal";

/**
 * Lead detail — split view: live transcript + profile + takeover.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 2), planning/03-architecture.md
 * (Flow C, Flow D).
 */
export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="grid min-h-screen grid-cols-[2fr_1fr] gap-4 p-4">
      <LiveTranscript leadId={params.id} />
      <aside className="flex flex-col gap-4">
        <LeadProfile leadId={params.id} />
        <TakeoverModal leadId={params.id} />
      </aside>
    </main>
  );
}
