import Link from "next/link";
import { HubThemeToggle } from "./hub-theme";

interface HubHeaderProps {
  view: "cards" | "table";
}

export function HubHeader({ view }: HubHeaderProps) {
  return (
    <header className="mb-10 flex items-center justify-between opacity-0-start animate-fade-up">
      <Link href="/" className="group flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105">
          AC
        </span>
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            amrikchhauni.in
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Development &amp; demo hub
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {view === "cards" ? (
          <Link
            href="/table"
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            Table view
          </Link>
        ) : (
          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            Card view
          </Link>
        )}
        <Link
          href="/login"
          className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          Admin
        </Link>
        <HubThemeToggle />
      </div>
    </header>
  );
}
