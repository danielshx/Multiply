import { SwarmGrid } from "@/components/swarm/SwarmGrid";
import { KPIHeader } from "@/components/kpi/KPIHeader";
import { RevenueCounter } from "@/components/swarm/RevenueCounter";
import { SignalTicker } from "@/components/swarm/SignalTicker";
import { LearningLog } from "@/components/learning/LearningLog";

/**
 * Dashboard — the hero screen. Bloomberg-terminal feel.
 *
 * Brain-repo: planning/06-ui-screens.md (Pipeline board), README.md lines 53–78
 * (tech architecture, dashboard requirements), README.md lines 286–294
 * (Bloomberg-terminal polish).
 */
export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <KPIHeader />
        <RevenueCounter />
      </header>
      <SignalTicker />
      <SwarmGrid />
      <LearningLog />
    </main>
  );
}
