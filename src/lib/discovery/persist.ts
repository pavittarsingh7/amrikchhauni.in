import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";
import { getPathSetting } from "@/lib/settings/service";
import { discoverNginxSites } from "./nginx";
import { discoverPm2Processes } from "./pm2";
import { discoverIisSites } from "./iis";
import { discoverApplications } from "./applications";
import type {
  ApplicationDiscovery,
  DiscoveryResult,
  DiscoveryRunSummary,
  IisSiteDiscovery,
  NginxSiteDiscovery,
  Pm2ProcessDiscovery,
} from "./types";

function result<T>(
  items: T[],
  created: number,
  updated: number,
  errors: string[] = []
): DiscoveryResult<T> {
  return {
    success: errors.length === 0,
    discovered: items.length,
    created,
    updated,
    errors,
    items,
  };
}

export async function persistNginxDiscovery(): Promise<
  DiscoveryResult<NginxSiteDiscovery>
> {
  const sitesPath = await getPathSetting("paths.nginx_sites");
  const sites = await discoverNginxSites(sitesPath);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const site of sites) {
    try {
      const existingConfig = await prisma.nginxConfig.findUnique({
        where: { filename: site.filename },
      });

      await prisma.nginxConfig.upsert({
        where: { filename: site.filename },
        update: {
          filepath: site.filepath,
          content: site.content,
          domain: site.hostname,
        },
        create: {
          filename: site.filename,
          filepath: site.filepath,
          content: site.content,
          domain: site.hostname,
        },
      });

      const existingDomain = await prisma.domain.findUnique({
        where: { hostname: site.hostname },
      });

      await prisma.domain.upsert({
        where: { hostname: site.hostname },
        update: {
          subdomain: site.subdomain,
          sslEnabled: site.sslEnabled,
          proxyPass: site.proxyPass,
          rootPath: site.rootPath,
          targetPort: site.targetPort,
          nginxConfigPath: site.filepath,
          discovered: true,
        },
        create: {
          hostname: site.hostname,
          subdomain: site.subdomain,
          sslEnabled: site.sslEnabled,
          proxyPass: site.proxyPass,
          rootPath: site.rootPath,
          targetPort: site.targetPort,
          nginxConfigPath: site.filepath,
          discovered: true,
        },
      });

      if (site.targetPort) {
        await prisma.port.upsert({
          where: { number: site.targetPort },
          update: { status: "IN_USE" },
          create: {
            number: site.targetPort,
            status: "IN_USE",
            notes: `Discovered from nginx: ${site.hostname}`,
          },
        });
      }

      if (existingConfig || existingDomain) updated++;
      else created++;
    } catch (err) {
      errors.push(
        `${site.hostname}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  await createSnapshot("nginx", sites);
  await writeAuditLog({
    action: "DISCOVER",
    module: "nginx",
    after: { discovered: sites.length, created, updated },
  });

  return result(sites, created, updated, errors);
}

export async function persistPm2Discovery(): Promise<
  DiscoveryResult<Pm2ProcessDiscovery>
> {
  const processes = await discoverPm2Processes();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  const discoveredNames = new Set(processes.map((p) => p.name));

  for (const proc of processes) {
    try {
      const existing = await prisma.pm2Process.findUnique({
        where: { name: proc.name },
      });

      await prisma.pm2Process.upsert({
        where: { name: proc.name },
        update: {
          status: proc.status,
          port: proc.port,
          pid: proc.pid,
          uptime: proc.uptime,
          restarts: proc.restarts,
          ecosystemPath: proc.ecosystemPath,
          discovered: true,
        },
        create: {
          name: proc.name,
          status: proc.status,
          port: proc.port,
          pid: proc.pid,
          uptime: proc.uptime,
          restarts: proc.restarts,
          ecosystemPath: proc.ecosystemPath,
          discovered: true,
        },
      });

      if (proc.port) {
        await prisma.port.upsert({
          where: { number: proc.port },
          update: { status: "IN_USE" },
          create: {
            number: proc.port,
            status: "IN_USE",
            notes: `Discovered from PM2: ${proc.name}`,
          },
        });
      }

      if (existing) updated++;
      else created++;
    } catch (err) {
      errors.push(
        `${proc.name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  // Mark processes no longer in PM2 as stopped
  const stale = await prisma.pm2Process.findMany({
    where: { discovered: true, name: { notIn: [...discoveredNames] } },
  });
  for (const s of stale) {
    await prisma.pm2Process.update({
      where: { id: s.id },
      data: { status: "stopped" },
    });
  }

  await createSnapshot("applications", processes, "pm2");
  await writeAuditLog({
    action: "DISCOVER",
    module: "pm2",
    after: { discovered: processes.length, created, updated },
  });

  return result(processes, created, updated, errors);
}

export async function persistIisDiscovery(): Promise<
  DiscoveryResult<IisSiteDiscovery>
> {
  const sites = await discoverIisSites();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const site of sites) {
    try {
      const existing = await prisma.iisSite.findUnique({
        where: { name: site.name },
      });

      await prisma.iisSite.upsert({
        where: { name: site.name },
        update: {
          bindings: site.bindings,
          appPool: site.appPool,
          physicalPath: site.physicalPath,
          state: site.state,
          pattern: site.pattern,
          discovered: true,
        },
        create: {
          name: site.name,
          bindings: site.bindings,
          appPool: site.appPool,
          physicalPath: site.physicalPath,
          state: site.state,
          pattern: site.pattern,
          discovered: true,
        },
      });

      if (existing) updated++;
      else created++;
    } catch (err) {
      errors.push(
        `${site.name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  await createSnapshot("applications", sites, "iis");
  await writeAuditLog({
    action: "DISCOVER",
    module: "iis",
    after: { discovered: sites.length, created, updated },
  });

  return result(sites, created, updated, errors);
}

export async function persistApplicationDiscovery(): Promise<
  DiscoveryResult<ApplicationDiscovery>
> {
  const roots = await Promise.all([
    getPathSetting("paths.projects"),
    getPathSetting("paths.amrikprojects"),
    getPathSetting("paths.python"),
  ]);

  const apps = await discoverApplications(roots);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const app of apps) {
    try {
      const existingApp = await prisma.application.findFirst({
        where: { projectPath: app.projectPath },
      });
      if (existingApp) continue;

      const existingSuggestion = await prisma.discoverySuggestion.findFirst({
        where: {
          type: "application",
          name: app.name,
          source: app.source,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });

      if (existingSuggestion) {
        await prisma.discoverySuggestion.update({
          where: { id: existingSuggestion.id },
          data: { data: JSON.parse(JSON.stringify(app)), updatedAt: new Date() },
        });
        updated++;
        continue;
      }

      await prisma.discoverySuggestion.create({
        data: {
          type: "application",
          source: app.source,
          name: app.name,
          data: JSON.parse(JSON.stringify(app)),
          status: "PENDING",
        },
      });
      created++;
    } catch (err) {
      errors.push(
        `${app.name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  await createSnapshot("applications", apps);
  await writeAuditLog({
    action: "DISCOVER",
    module: "applications",
    after: { discovered: apps.length, suggestionsCreated: created, updated },
  });

  return result(apps, created, updated, errors);
}

export async function runAllDiscovery(): Promise<DiscoveryRunSummary> {
  const safe = async <T>(
    fn: () => Promise<DiscoveryResult<T>>,
    label: string
  ): Promise<DiscoveryResult<T>> => {
    try {
      return await fn();
    } catch (err) {
      return result([], 0, 0, [
        err instanceof Error ? err.message : `${label} discovery failed`,
      ]);
    }
  };

  const [nginx, pm2, iis, application] = await Promise.all([
    safe(persistNginxDiscovery, "Nginx"),
    safe(persistPm2Discovery, "PM2"),
    safe(persistIisDiscovery, "IIS"),
    safe(persistApplicationDiscovery, "Application"),
  ]);

  return { nginx, pm2, iis, application };
}

export async function approveDiscoverySuggestion(
  suggestionId: string,
  userId: string
): Promise<void> {
  const suggestion = await prisma.discoverySuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion || suggestion.status !== "PENDING") {
    throw new Error("Suggestion not found or already reviewed");
  }

  const data = suggestion.data as unknown as ApplicationDiscovery;

  const technology = await prisma.technology.findFirst({
    where: { name: data.technology },
  });
  const deploymentType = await prisma.deploymentType.findFirst({
    where: { name: data.deploymentType },
  });

  await prisma.$transaction(async (tx) => {
    await tx.application.create({
      data: {
        name: data.name,
        projectPath: data.projectPath,
        repositoryUrl: data.repositoryUrl,
        technologyId: technology?.id,
        deploymentTypeId: deploymentType?.id,
        createdById: userId,
        status: "PLANNED",
        notes: `Discovered from ${data.source}`,
      },
    });

    await tx.discoverySuggestion.update({
      where: { id: suggestionId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
  });

  await writeAuditLog({
    action: "APPROVE",
    module: "discovery",
    entityId: suggestionId,
    after: { name: data.name, projectPath: data.projectPath },
  });
}

export async function rejectDiscoverySuggestion(
  suggestionId: string,
  notes?: string
): Promise<void> {
  const suggestion = await prisma.discoverySuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion || suggestion.status !== "PENDING") {
    throw new Error("Suggestion not found or already reviewed");
  }

  await prisma.discoverySuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewNotes: notes ?? null,
    },
  });

  await writeAuditLog({
    action: "REJECT",
    module: "discovery",
    entityId: suggestionId,
    after: { name: suggestion.name },
  });
}
