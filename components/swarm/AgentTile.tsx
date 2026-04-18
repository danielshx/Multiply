import type { AgentMode } from "@/lib/happyrobot/types";
import { ModeBadge } from "./ModeBadge";

/**
 * One agent's live state in the swarm grid.
 *
 * Brain-repo: README.md lines 47–48 (tile contents),
 * planning/06-ui-screens.md (Lead card spec).
 */
export interface AgentTileProps {
  leadId: string;
  leadName: string;
  mode: AgentMode;
  signalScore?: number;
  isLive?: boolean;
}

export function AgentTile({ leadName, mode }: AgentTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm">{leadName}</span>
        <ModeBadge mode={mode} />
      </div>
      <div className="h-8 rounded bg-background/50 font-mono text-[10px] text-muted-foreground">
        {/* TODO: SignalGraph mini-chart */}
      </div>
    </div>
  );
}
