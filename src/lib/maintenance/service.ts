import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { getPathSetting } from "@/lib/settings/service";
import { testNginxConfig, reloadNginx } from "@/lib/nginx/service";

async function getMaintenanceDir(): Promise<string> {
  return getPathSetting("paths.maintenance");
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

  await fs.writeFile(path.join(dir, "page.html"), html, "utf-8");
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

async function ensureNginxMaintenanceSetup(maintenanceDir: string) {
  const nginxConfPath = await getPathSetting("paths.nginx_conf");
  const nginxConf = path.join(nginxConfPath, "nginx.conf");
  const mapPath = path.join(maintenanceDir, "acdm-map.conf").replace(/\\/g, "/");
  const includeLine = `include ${mapPath};`;

  let confContent = await fs.readFile(nginxConf, "utf-8");
  if (!confContent.includes("acdm-map.conf")) {
    confContent = confContent.replace(
      /(\s*include\s+D:\/nginx\/conf\/sites\/\*\.conf;)/,
      `\n    ${includeLine}\n$1`
    );
    await fs.writeFile(nginxConf, confContent, "utf-8");
  }

  const proxyCommonPath = path.join(nginxConfPath, "snippets", "proxy-common.conf");
  let proxyContent = await fs.readFile(proxyCommonPath, "utf-8");
  const maintenanceCheck = `if ($acdm_maintenance) { return 503; }`;
  if (!proxyContent.includes("$acdm_maintenance")) {
    proxyContent = `${maintenanceCheck}\n${proxyContent}`;
    await fs.writeFile(proxyCommonPath, proxyContent, "utf-8");
  }

  const errorPageBlock = `
error_page 503 /acdm-maintenance.html;
location = /acdm-maintenance.html {
    root ${maintenanceDir.replace(/\\/g, "/")};
    internal;
}`;
  if (!confContent.includes("acdm-maintenance.html")) {
    const updated = await fs.readFile(nginxConf, "utf-8");
    const newContent = updated.replace(
      /(\s*include\s+D:\/nginx\/conf\/sites\/\*\.conf;)/,
      `${errorPageBlock}\n$1`
    );
    await fs.writeFile(nginxConf, newContent, "utf-8");
  }
}

async function regenerateMaintenanceMap(maintenanceDir: string) {
  const configs = await prisma.maintenanceConfig.findMany({
    where: { enabled: true },
    include: { domain: true },
  });

  const serverWide = configs.find((c) => c.scope === "SERVER");
  const siteConfigs = configs.filter(
    (c) => c.scope === "SITE" && c.domain?.hostname
  );

  let mapContent: string;

  if (serverWide) {
    mapContent = `map $host $acdm_maintenance {
    default 1;
}
`;
  } else if (siteConfigs.length > 0) {
    const entries = siteConfigs
      .map((c) => `    ${c.domain!.hostname} 1;`)
      .join("\n");
    mapContent = `map $host $acdm_maintenance {
    default 0;
${entries}
}
`;
  } else {
    mapContent = `map $host $acdm_maintenance {
    default 0;
}
`;
  }

  await fs.writeFile(
    path.join(maintenanceDir, "acdm-map.conf"),
    mapContent,
    "utf-8"
  );
}

export async function setSiteMaintenance(
  domainId: string,
  enabled: boolean,
  options: { autoReload?: boolean } = {}
) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) throw new Error("Domain not found");

  const maintenanceDir = await getMaintenanceDir();
  await ensureNginxMaintenanceSetup(maintenanceDir);

  const includeFilePath = path
    .join(maintenanceDir, "sites", `${domain.hostname}.conf`)
    .replace(/\\/g, "/");

  const existing = await prisma.maintenanceConfig.findFirst({
    where: { domainId, scope: "SITE" },
  });

  if (existing) {
    await prisma.maintenanceConfig.update({
      where: { id: existing.id },
      data: { enabled, includeFilePath },
    });
  } else {
    await prisma.maintenanceConfig.create({
      data: {
        scope: "SITE",
        enabled,
        domainId,
        includeFilePath,
      },
    });
  }

  await regenerateMaintenanceMap(maintenanceDir);

  const test = await testNginxConfig();
  if (!test.passed) {
    await prisma.maintenanceConfig.updateMany({
      where: { domainId, scope: "SITE" },
      data: { enabled: !enabled },
    });
    await regenerateMaintenanceMap(maintenanceDir);
    throw new Error(`Nginx test failed: ${test.output}`);
  }

  if (options.autoReload) await reloadNginx();

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
  const maintenanceDir = await getMaintenanceDir();
  await ensureNginxMaintenanceSetup(maintenanceDir);

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
        includeFilePath: path.join(maintenanceDir, "server-maintenance.conf"),
      },
    });
  }

  await regenerateMaintenanceMap(maintenanceDir);

  const test = await testNginxConfig();
  if (!test.passed) {
    throw new Error(`Nginx test failed: ${test.output}`);
  }

  if (options.autoReload) await reloadNginx();

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

  const enabledByDomain = new Map(
    configs
      .filter((c) => c.scope === "SITE" && c.domainId && c.enabled)
      .map((c) => [c.domainId!, true])
  );

  return {
    page,
    configs,
    serverWideEnabled: serverConfig?.enabled ?? false,
    domains: domains.map((d) => ({
      ...d,
      maintenanceEnabled: enabledByDomain.has(d.id),
    })),
  };
}
