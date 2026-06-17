export const CATEGORY_COLORS: Record<string, string> = {
  Hub: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  Pavittar:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  Development:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  Hobby:
    "bg-pink-50 text-pink-800 ring-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:ring-pink-800",
  Sanjeev:
    "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
  Amrik:
    "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800",
  Client:
    "bg-cyan-50 text-cyan-800 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-800",
  Personal:
    "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800",
};

export const STATUS_COLORS: Record<string, string> = {
  Live: "bg-green-100 text-green-800 ring-green-200 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800",
  UnderConstruction:
    "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800",
  Beta: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
  Planned:
    "bg-rose-100 text-rose-600 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800",
  Archived:
    "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600",
};

export const DEFAULT_BADGE =
  "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

export function badgeClass(map: Record<string, string>, key: string): string {
  return map[key] ?? DEFAULT_BADGE;
}
