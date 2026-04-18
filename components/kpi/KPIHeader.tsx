/**
 * KPI strip — Total · Contacted · Qualified · Booked.
 *
 * Brain-repo: planning/06-ui-screens.md (Screen 5 — KPI header),
 * README.md line 51 (final outcome strip).
 */
const TILES = [
  { label: "Contacted", value: "0" },
  { label: "Qualified", value: "0" },
  { label: "Booked", value: "0" },
  { label: "Handoffs", value: "0" },
];

export function KPIHeader() {
  return (
    <div className="flex gap-3">
      {TILES.map((t) => (
        <div
          key={t.label}
          className="rounded-md border border-border bg-card px-4 py-2"
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {t.label}
          </div>
          <div className="font-mono text-2xl">{t.value}</div>
        </div>
      ))}
    </div>
  );
}
