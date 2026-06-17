import type { HubProject, HubStats } from "./types";

export function computeHubStats(projects: HubProject[]): HubStats {
  return {
    total: projects.length,
    live: projects.filter((p) => p.status === "Live").length,
    featured: projects.filter((p) => p.featured).length,
    underConstruction: projects.filter((p) => p.status === "UnderConstruction")
      .length,
    planned: projects.filter((p) => p.status === "Planned").length,
  };
}

export function sortHubProjects(projects: HubProject[]): HubProject[] {
  return [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function projectSearchText(p: HubProject): string {
  return [
    p.name,
    p.subdomain,
    p.url,
    p.description,
    p.category,
    p.status,
    p.remark,
    p.note,
    p.port,
    p.technology,
    p.deploymentType,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .join(" ")
    .toLowerCase();
}
