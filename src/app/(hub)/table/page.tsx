import { HubHeader } from "@/components/hub/hub-header";
import { HubFooter } from "@/components/hub/hub-footer";
import { HubStatsBar } from "@/components/hub/hub-stats";
import { HubTableView } from "@/components/hub/hub-views";
import { getHubProjects, computeHubStats } from "@/lib/hub/service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "amrikchhauni.in — Projects Table View",
  description: "Tabular view of projects hosted on amrikchhauni.in subdomains.",
};

export const dynamic = "force-dynamic";

export default async function HubTablePage() {
  const projects = await getHubProjects();
  const stats = computeHubStats(projects);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col">
      <HubHeader view="table" />

      <section className="mb-8 text-center sm:mb-10">
        <h1 className="opacity-0-start animate-fade-up-delay font-display text-3xl font-bold tracking-tight hub-title sm:text-4xl">
          Projects
        </h1>
        <p className="opacity-0-start animate-fade-up-delay-2 hub-subtitle mx-auto mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
          All application fields from the ACDM database in a filterable directory
          view.
        </p>
        <HubStatsBar stats={stats} />
      </section>

      <HubTableView projects={projects} />
      <HubFooter />
    </div>
  );
}
