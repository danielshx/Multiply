import type { AgentMode } from "@/lib/happyrobot/types";
import { cn } from "@/lib/utils";

const LABEL: Record<AgentMode, string> = {
  cold: "🧊 Cold",
  warm: "🌡 Warm",
  hot: "🔥 Hot",
  handoff: "👤 Handoff",
};

const STYLES: Record<AgentMode, string> = {
  cold: "bg-mode-cold/10 text-mode-cold border-mode-cold/30",
  warm: "bg-mode-warm/10 text-mode-warm border-mode-warm/30",
  hot: "bg-mode-hot/10 text-mode-hot border-mode-hot/30 animate-pulse-ring",
  handoff: "bg-mode-handoff/10 text-mode-handoff border-mode-handoff/30",
};

export function ModeBadge({ mode }: { mode: AgentMode }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 font-mono text-xs",
        STYLES[mode],
      )}
    >
      {LABEL[mode]}
    </span>
  );
}
