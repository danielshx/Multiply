import { AgentTile } from "./AgentTile";

/**
 * 25-tile grid (5×5). Hero of the dashboard.
 *
 * Brain-repo: README.md lines 36–48 (Swarm composition),
 * line 323 ("50 → 25 Agents"), planning/06-ui-screens.md.
 */
export function SwarmGrid() {
  const tiles = Array.from({ length: 25 }, (_, i) => i);
  return (
    <section className="grid grid-cols-5 gap-3">
      {tiles.map((i) => (
        <AgentTile
          key={i}
          leadId={`stub-${i}`}
          leadName={`Lead ${i + 1}`}
          mode="cold"
        />
      ))}
    </section>
  );
}
