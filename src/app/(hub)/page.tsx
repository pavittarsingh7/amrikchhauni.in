import { HubHeader } from "@/components/hub/hub-header";
import { HubFooter } from "@/components/hub/hub-footer";
import { HubStatsBar } from "@/components/hub/hub-stats";
import { HubCardView } from "@/components/hub/hub-views";
import { getHubProjects, computeHubStats } from "@/lib/hub/service";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const projects = await getHubProjects();
  const stats = computeHubStats(projects);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <HubHeader view="cards" />

      <section className="mb-12 text-center sm:mb-14">
        <p className="opacity-0-start animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-4 py-1.5 text-xs font-medium text-indigo-700 backdrop-blur transition-colors duration-300 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          Personal development &amp; client presentation
        </p>
        <h1 className="opacity-0-start animate-fade-up-delay font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          Project showcase
        </h1>
        <p className="opacity-0-start animate-fade-up-delay-2 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
          A curated directory of apps and demos hosted on subdomains.{" "}
          <span className="text-slate-500 dark:text-slate-500">
            This is only for testing and demos, not for production.
          </span>
        </p>
        <HubStatsBar stats={stats} />
      </section>

      <HubCardView projects={projects} />
      <HubFooter />
    </div>
  );
}
