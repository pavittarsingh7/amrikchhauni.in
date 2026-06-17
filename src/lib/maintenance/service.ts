import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import {
  applyMaintenanceToContent,
  backupNginxConfigFile,
  ensureMaintenanceSnippetFiles,
  isMaintenanceNginxContent,
  resolveNginxConfigForDomain,
  writeNginxConfigFile,
  type NginxRollbackEntry,
} from "./nginx-config";
import { finalizeNginxMaintenanceChange } from "./nginx-apply";
import {
  buildGlobalMaintenanceMarker,
  getMaintenanceDir,
  getNginxMaintenanceDir,
} from "./templates";

export type MaintenancePreview = {
  hostname: string;
  nginxConfigPath: string;
  original: string;
  proposed: string;
  action: "enable" | "disable" | "no-change";
};

async function isServerMaintenanceEnabled(): Promise<boolean> {
  const server = await prisma.maintenanceConfig.findFirst({
    where: { scope: "SERVER" },
  });
  return server?.enabled ?? false;
}

async function getSiteMaintenanceConfig(domainId: string) {
  return prisma.maintenanceConfig.findFirst({
    where: { domainId, scope: "SITE" },
  });
}

async function shouldDomainBeInMaintenance(
  domainId: string,
  serverEnabled: boolean,
  siteEnabled?: boolean
): Promise<boolean> {
  if (serverEnabled) return true;
  if (siteEnabled !== undefined) return siteEnabled;
  const site = await getSiteMaintenanceConfig(domainId);
  return site?.enabled ?? false;
}

async function readNginxContent(config: { filepath: string; content: string | null }) {
  return (
    (await fs.readFile(config.filepath, "utf-8").catch(() => null)) ??
    config.content ??
    ""
  );
}

async function writeGlobalMaintenanceMarker(
  enabled: boolean,
  siteCount: number
): Promise<void> {
  const nginxMaintenanceDir = await getNginxMaintenanceDir();
  await fs.mkdir(nginxMaintenanceDir, { recursive: true });
  await fs.writeFile(
    path.join(nginxMaintenanceDir, "global-maintenance.conf"),
    buildGlobalMaintenanceMarker(enabled, siteCount),
    "utf-8"
  );
}

async function upsertSiteMaintenanceRecord(
  domainId: string,
  data: {
    enabled: boolean;
    nginxConfigId?: string | null;
    originalContent?: string | null;
    includeFilePath?: string | null;
  }
) {
  const existing = await getSiteMaintenanceConfig(domainId);
  if (existing) {
    return prisma.maintenanceConfig.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.maintenanceConfig.create({
    data: {
      scope: "SITE",
      domainId,
      enabled: data.enabled,
      nginxConfigId: data.nginxConfigId ?? null,
      originalContent: data.originalContent ?? null,
      includeFilePath: data.includeFilePath ?? null,
    },
  });
}

export async function getMaintenancePage() {
  return prisma.maintenancePage.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateMaintenancePage(input: {
  title: string;
  description?: string;
  expectedReturn?: string;
  logoPath?: string;
}) {
  const existing = await prisma.maintenancePage.findFirst({
    where: { isActive: true },
  });

  const page = existing
    ? await prisma.maintenancePage.update({
        where: { id: existing.id },
        data: input,
      })
    : await prisma.maintenancePage.create({
        data: { ...input, isActive: true },
      });

  await generateMaintenanceHtml(page);
  await writeAuditLog({
    action: "UPDATE",
    module: "maintenance",
    entityId: page.id,
    after: input,
  });

  return page;
}

async function generateMaintenanceHtml(page: {
  title: string;
  description: string | null;
  expectedReturn: string | null;
  logoPath: string | null;
}) {
  const dir = await getMaintenanceDir();
  await fs.mkdir(dir, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #e2e8f0; padding: 2rem;
    }
    .card {
      max-width: 520px; text-align: center; padding: 3rem 2rem;
      background: rgba(15,23,42,0.8); border: 1px solid #334155;
      border-radius: 1rem; backdrop-filter: blur(8px);
    }
    h1 { font-size: 1.75rem; margin-bottom: 1rem; color: #fff; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 1rem; }
    .return { color: #60a5fa; font-size: 0.9rem; margin-top: 1.5rem; }
    img { max-width: 120px; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="card">
    ${page.logoPath ? `<img src="${escapeHtml(page.logoPath)}" alt="Logo" />` : ""}
    <h1>${escapeHtml(page.title)}</h1>
    <p>${escapeHtml(page.description ?? "We are currently performing scheduled maintenance.")}</p>
    ${page.expectedReturn ? `<p class="return">Expected return: ${escapeHtml(page.expectedReturn)}</p>` : ""}
  </div>
</body>
</html>`;

  await fs.writeFile(path.join(dir, "index.html"), html, "utf-8");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function listMaintenanceConfigs() {
  return prisma.maintenanceConfig.findMany({
    include: {
      domain: { select: { id: true, hostname: true } },
      application: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function previewDomainMaintenanceState(
  domainId: string,
  opts: { siteEnabled: boolean; serverEnabled: boolean }
): Promise<MaintenancePreview> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) throw new Error("Domain not found");

  const nginxConfig = await resolveNginxConfigForDomain(domain);
  if (!nginxConfig) {
    throw new Error(`No nginx config found for ${domain.hostname}`);
  }

  const wantMaintenance = opts.serverEnabled || opts.siteEnabled;
  const current = await readNginxContent(nginxConfig);
  const siteConfig = await getSiteMaintenanceConfig(domainId);
  const storedOriginal = siteConfig?.originalContent ?? null;

  const maintenanceDir = await getMaintenanceDir();
  const { websiteMaintenanceConf } = await ensureMaintenanceSnippetFiles(
    maintenanceDir
  );

  let proposed = current;
  let action: MaintenancePreview["action"] = "no-change";

  if (wantMaintenance && !isMaintenanceNginxContent(current)) {
    proposed = applyMaintenanceToContent(current, websiteMaintenanceConf);
    action = "enable";
  } else if (!wantMaintenance && isMaintenanceNginxContent(current)) {
    if (!storedOriginal) {
      throw new Error(
        `Original nginx config not stored for ${domain.hostname} — cannot preview restore`
      );
    }
    proposed = storedOriginal;
    action = "disable";
  }

  return {
    hostname: domain.hostname,
    nginxConfigPath: nginxConfig.filepath,
    original: current,
    proposed,
    action,
  };
}

export async function previewSiteMaintenance(
  domainId: string,
  siteEnabled: boolean
): Promise<MaintenancePreview> {
  const serverEnabled = await isServerMaintenanceEnabled();
  return previewDomainMaintenanceState(domainId, { siteEnabled, serverEnabled });
}

export async function previewServerMaintenance(
  enabled: boolean
): Promise<MaintenancePreview[]> {
  const domains = await prisma.domain.findMany({
    orderBy: { hostname: "asc" },
  });

  const previews: MaintenancePreview[] = [];
  for (const domain of domains) {
    const siteConfig = await getSiteMaintenanceConfig(domain.id);
    const siteEnabled = siteConfig?.enabled ?? false;

    try {
      const preview = await previewDomainMaintenanceState(domain.id, {
        siteEnabled,
        serverEnabled: enabled,
      });
      previews.push(preview);
    } catch {
      // Domain has no nginx config — skip in preview list
    }
  }

  return previews;
}

async function applyDomainMaintenanceSync(
  domainId: string,
  websiteMaintenanceConf: string,
  rollback: NginxRollbackEntry[]
): Promise<void> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return;

  const nginxConfig = await resolveNginxConfigForDomain(domain);
  if (!nginxConfig) {
    throw new Error(`No nginx config found for ${domain.hostname}`);
  }

  const serverEnabled = await isServerMaintenanceEnabled();
  const siteConfig = await getSiteMaintenanceConfig(domainId);
  const wantMaintenance = await shouldDomainBeInMaintenance(
    domainId,
    serverEnabled,
    siteConfig?.enabled
  );

  const current = await readNginxContent(nginxConfig);
  const isMaintenance = isMaintenanceNginxContent(current);

  if (wantMaintenance && !isMaintenance) {
    await backupNginxConfigFile(nginxConfig, "pre-maintenance");
    const originalContent = current;
    const newContent = applyMaintenanceToContent(
      current,
      websiteMaintenanceConf
    );

    rollback.push({ config: nginxConfig, previousContent: current });
    await writeNginxConfigFile(nginxConfig, newContent);

    await upsertSiteMaintenanceRecord(domainId, {
      enabled: siteConfig?.enabled ?? false,
      nginxConfigId: nginxConfig.id,
      originalContent,
      includeFilePath: websiteMaintenanceConf,
    });
  } else if (!wantMaintenance && isMaintenance) {
    const originalContent = siteConfig?.originalContent;
    if (!originalContent) {
      throw new Error(
        `Missing stored original config for ${domain.hostname} — cannot restore`
      );
    }

    rollback.push({ config: nginxConfig, previousContent: current });
    await writeNginxConfigFile(nginxConfig, originalContent);

    await upsertSiteMaintenanceRecord(domainId, {
      enabled: siteConfig?.enabled ?? false,
      nginxConfigId: nginxConfig.id,
      originalContent: null,
      includeFilePath: null,
    });
  }
}

export async function setSiteMaintenance(
  domainId: string,
  enabled: boolean,
  options: { autoReload?: boolean } = {}
) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) throw new Error("Domain not found");

  const existing = await getSiteMaintenanceConfig(domainId);
  if (existing) {
    await prisma.maintenanceConfig.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await prisma.maintenanceConfig.create({
      data: { scope: "SITE", domainId, enabled },
    });
  }

  const maintenanceDir = await getMaintenanceDir();
  const { websiteMaintenanceConf } = await ensureMaintenanceSnippetFiles(
    maintenanceDir
  );

  const rollback: NginxRollbackEntry[] = [];
  await applyDomainMaintenanceSync(
    domainId,
    websiteMaintenanceConf,
    rollback
  );

  await finalizeNginxMaintenanceChange(rollback, {
    autoReload: options.autoReload,
    auditEntityId: domainId,
    auditAction: enabled ? "site_enable" : "site_disable",
    onRollback: async () => {
      await prisma.maintenanceConfig.updateMany({
        where: { domainId, scope: "SITE" },
        data: { enabled: !enabled },
      });
    },
  });

  await writeAuditLog({
    action: enabled ? "ENABLE" : "DISABLE",
    module: "maintenance",
    entityId: domainId,
    after: { hostname: domain.hostname, enabled },
  });
}

export async function setServerMaintenance(
  enabled: boolean,
  options: { autoReload?: boolean } = {}
) {
  const existing = await prisma.maintenanceConfig.findFirst({
    where: { scope: "SERVER" },
  });

  if (existing) {
    await prisma.maintenanceConfig.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await prisma.maintenanceConfig.create({
      data: {
        scope: "SERVER",
        enabled,
        includeFilePath: path.join(
          await getNginxMaintenanceDir(),
          "global-maintenance.conf"
        ),
      },
    });
  }

  const maintenanceDir = await getMaintenanceDir();
  const { websiteMaintenanceConf } = await ensureMaintenanceSnippetFiles(
    maintenanceDir
  );

  const domains = await prisma.domain.findMany();
  const rollback: NginxRollbackEntry[] = [];

  for (const domain of domains) {
    await applyDomainMaintenanceSync(
      domain.id,
      websiteMaintenanceConf,
      rollback
    );
  }

  await finalizeNginxMaintenanceChange(rollback, {
    autoReload: options.autoReload,
    auditAction: enabled ? "server_enable" : "server_disable",
    onRollback: async () => {
      await prisma.maintenanceConfig.updateMany({
        where: { scope: "SERVER" },
        data: { enabled: !enabled },
      });
    },
  });

  await writeGlobalMaintenanceMarker(
    enabled,
    rollback.length > 0
      ? rollback.length
      : (
          await Promise.all(
            domains.map(async (d) => {
              const cfg = await resolveNginxConfigForDomain(d);
              if (!cfg) return false;
              const content = await readNginxContent(cfg);
              return isMaintenanceNginxContent(content);
            })
          )
        ).filter(Boolean).length
  );

  await writeAuditLog({
    action: enabled ? "SERVER_ENABLE" : "SERVER_DISABLE",
    module: "maintenance",
    after: { enabled },
  });
}

export async function getMaintenanceStatus() {
  const [page, configs, serverConfig, domains] = await Promise.all([
    getMaintenancePage(),
    listMaintenanceConfigs(),
    prisma.maintenanceConfig.findFirst({ where: { scope: "SERVER" } }),
    prisma.domain.findMany({
      select: { id: true, hostname: true },
      orderBy: { hostname: "asc" },
    }),
  ]);

  const serverWideEnabled = serverConfig?.enabled ?? false;
  const enabledByDomain = new Map(
    configs
      .filter((c) => c.scope === "SITE" && c.domainId && c.enabled)
      .map((c) => [c.domainId!, true])
  );

  return {
    page,
    configs,
    serverWideEnabled,
    domains: domains.map((d) => ({
      ...d,
      maintenanceEnabled:
        serverWideEnabled || enabledByDomain.has(d.id),
    })),
  };
}
