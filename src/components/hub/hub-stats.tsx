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
    <div className="opacity-0-start animate-fade-up-delay-2 mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
      {items.map((item) => (
        <span
          key={item.label}
          className="rounded-lg bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900/80 dark:ring-slate-800"
        >
          <strong className="text-slate-800 dark:text-slate-200">{item.value}</strong>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}
