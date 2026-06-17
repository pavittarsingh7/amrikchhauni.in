import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/service";
import type { ApplicationStatus } from "@/lib/db/types";
import type { HubProject } from "./types";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  LIVE: "Live",
  PLANNED: "Planned",
  BETA: "Beta",
  UNDER_CONSTRUCTION: "UnderConstruction",
  ARCHIVED: "Archived",
};

function subdomainLabel(
  hostname: string,
  subdomain: string | null,
  primaryHostname: string
): string {
  if (hostname === primaryHostname) return "Primary Domain";
  if (subdomain) return subdomain;
  const parts = hostname.split(".");
  if (parts.length > 2) return parts[0];
  return hostname;
}

function resolvePort(
  ports: { number: number }[],
  targetPort: number | null | undefined
): number | null {
  if (ports.length > 0) return ports[0].number;
  if (targetPort != null) return targetPort;
  return null;
}

export async function getHubProjects(): Promise<HubProject[]> {
  const primaryHostname =
    (await getSetting("domain.primary")) ?? "amrikchhauni.in";

  const apps = await prisma.application.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      ideaSource: true,
      technology: true,
      deploymentType: true,
      domains: { orderBy: { hostname: "asc" } },
      ports: { orderBy: { number: "asc" } },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return apps.map((app) => {
    const primaryDomain =
      app.domains.find((d) => d.hostname === primaryHostname) ??
      app.domains[0];

    const hostname = primaryDomain?.hostname ?? `${primaryHostname}`;
    const url = hostname.includes("://") ? hostname : `https://${hostname}`;

    return {
      id: app.id,
      name: app.name,
      subdomain: primaryDomain
        ? subdomainLabel(
            primaryDomain.hostname,
            primaryDomain.subdomain,
            primaryHostname
          )
        : "—",
      url,
      description: app.description ?? "",
      category: app.ideaSource?.name ?? "Uncategorized",
      status: STATUS_LABEL[app.status] ?? app.status,
      remark: app.remarks ?? "",
      note: app.notes ?? "",
      featured: app.featured,
      port: resolvePort(app.ports, primaryDomain?.targetPort),
      technology: app.technology?.name ?? null,
      deploymentType: app.deploymentType?.name ?? null,
    };
  });
}

export { computeHubStats } from "./utils";
