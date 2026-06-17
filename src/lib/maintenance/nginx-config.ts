import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import type { NginxConfig } from "../../../generated/prisma/client";
import {
  buildMaintenanceLocationBlock,
  buildWebsiteMaintenanceSnippet,
  MAINTENANCE_LOCATION_MARKER,
  toNginxPath,
  getNginxMaintenanceDir,
  getMaintenanceBackupDir,
} from "./templates";

export function isMaintenanceNginxContent(content: string): boolean {
  return content.includes(MAINTENANCE_LOCATION_MARKER);
}

export function replaceLocationRootBlock(
  content: string,
  newBlock: string
): string {
  const match = content.match(/location\s+\/\s*\{/);
  if (!match || match.index === undefined) {
    throw new Error("No location / block found in nginx config");
  }

  const start = match.index;
  const braceStart = content.indexOf("{", start);
  let depth = 0;
  let end = braceStart;

  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (depth !== 0) {
    throw new Error("Unbalanced braces in location / block");
  }

  return content.slice(0, start) + newBlock + content.slice(end + 1);
}

export function applyMaintenanceToContent(
  content: string,
  websiteMaintenanceInclude: string
): string {
  const block = buildMaintenanceLocationBlock(websiteMaintenanceInclude);
  return replaceLocationRootBlock(content, block);
}

export async function resolveNginxConfigForDomain(domain: {
  hostname: string;
  nginxConfigPath: string | null;
}): Promise<NginxConfig | null> {
  if (domain.nginxConfigPath) {
    const byPath = await prisma.nginxConfig.findFirst({
      where: { filepath: domain.nginxConfigPath },
    });
    if (byPath) return byPath;
  }

  const byDomain = await prisma.nginxConfig.findFirst({
    where: { domain: domain.hostname },
  });
  if (byDomain) return byDomain;

  const filename = `${domain.hostname}.conf`;
  return prisma.nginxConfig.findUnique({ where: { filename } });
}

export async function ensureMaintenanceSnippetFiles(
  maintenanceHtmlDir: string
): Promise<{
  websiteMaintenanceConf: string;
  globalMaintenanceConf: string;
}> {
  const nginxMaintenanceDir = await getNginxMaintenanceDir();
  await fs.mkdir(nginxMaintenanceDir, { recursive: true });

  const websiteMaintenanceConf = path.join(
    nginxMaintenanceDir,
    "website-maintenance.conf"
  );
  const globalMaintenanceConf = path.join(
    nginxMaintenanceDir,
    "global-maintenance.conf"
  );

  await fs.writeFile(
    websiteMaintenanceConf,
    buildWebsiteMaintenanceSnippet(maintenanceHtmlDir),
    "utf-8"
  );

  return {
    websiteMaintenanceConf: toNginxPath(websiteMaintenanceConf),
    globalMaintenanceConf: toNginxPath(globalMaintenanceConf),
  };
}

export async function backupNginxConfigFile(
  config: NginxConfig,
  reason: string
): Promise<string> {
  const content =
    (await fs.readFile(config.filepath, "utf-8").catch(() => null)) ??
    config.content ??
    "";

  const backupDir = await getMaintenanceBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `${config.filename}.${timestamp}.${reason}.bak`
  );
  await fs.writeFile(backupPath, content, "utf-8");
  return backupPath;
}

export async function writeNginxConfigFile(
  config: NginxConfig,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(config.filepath), { recursive: true });
  await fs.writeFile(config.filepath, content, "utf-8");
  await prisma.nginxConfig.update({
    where: { id: config.id },
    data: { content },
  });
}

export type NginxRollbackEntry = {
  config: NginxConfig;
  previousContent: string;
};

export async function rollbackNginxChanges(
  entries: NginxRollbackEntry[]
): Promise<void> {
  for (const entry of [...entries].reverse()) {
    await writeNginxConfigFile(entry.config, entry.previousContent);
  }
}
