import type { HubStats } from "@/lib/hub/types";

export function HubStatsBar({ stats }: { stats: HubStats }) {
  const items = [
    { label: "projects", value: stats.total },
    { label: "live", value: stats.live },
    { label: "featured", value: stats.featured },
    { label: "under construction", value: stats.underConstruction },
    { label: "planned", value: stats.planned },
  ];

  return (
    <div className="opacity-0-start animate-fade-up-delay-2 mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
      {items.map((item) => (
        <span key={item.label} className="hub-stat-pill">
          <strong>{item.value}</strong> {item.label}
        </span>
      ))}
    </div>
  );
}
