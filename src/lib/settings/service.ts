import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";

export interface SettingDefinition {
  key: string;
  value: string;
  category: string;
  label: string;
  description?: string;
  isSecret?: boolean;
}

export const DEFAULT_SETTINGS: SettingDefinition[] = [
  {
    key: "paths.config_root",
    value: "D:\\server-config",
    category: "paths",
    label: "Config Root",
    description: "Root directory for JSON snapshots and backups",
  },
  {
    key: "paths.nginx_root",
    value: "D:\\nginx",
    category: "paths",
    label: "Nginx Root",
    description: "Nginx installation directory",
  },
  {
    key: "paths.nginx_conf",
    value: "D:\\nginx\\conf",
    category: "paths",
    label: "Nginx Config Root",
  },
  {
    key: "paths.nginx_sites",
    value: "D:\\nginx\\conf\\sites",
    category: "paths",
    label: "Nginx Site Configs",
  },
  {
    key: "paths.pm2_root",
    value: "D:\\pm2",
    category: "paths",
    label: "PM2 Root",
  },
  {
    key: "paths.win_acme",
    value: "C:\\win-acme\\wacs.exe",
    category: "paths",
    label: "Win-ACME Path",
  },
  {
    key: "paths.projects",
    value: "D:\\projects",
    category: "paths",
    label: "Projects Path",
  },
  {
    key: "paths.amrikprojects",
    value: "D:\\amrikprojects",
    category: "paths",
    label: "Amrik Projects Path",
  },
  {
    key: "paths.python",
    value: "D:\\python",
    category: "paths",
    label: "Python Projects Path",
  },
  {
    key: "paths.under_construction",
    value: "D:\\under-construction",
    category: "paths",
    label: "Under Construction Path",
  },
  {
    key: "paths.pg_dump",
    value: "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    category: "paths",
    label: "pg_dump Path",
  },
  {
    key: "paths.maintenance",
    value: "D:\\server-config\\maintenance",
    category: "paths",
    label: "Maintenance Pages Path",
  },
  {
    key: "paths.backups",
    value: "D:\\server-config\\backups",
    category: "paths",
    label: "Backups Root",
  },
  {
    key: "service.nginx_name",
    value: "nginx",
    category: "services",
    label: "Nginx Windows Service Name",
  },
  {
    key: "service.postgresql_name",
    value: "postgresql-x64-18",
    category: "services",
    label: "PostgreSQL Windows Service Name",
  },
  {
    key: "app.name",
    value: "ACDM",
    category: "general",
    label: "Application Name",
  },
  {
    key: "app.title",
    value: "Amrik Chhauni Deployment Manager",
    category: "general",
    label: "Application Title",
  },
  {
    key: "domain.primary",
    value: "amrikchhauni.in",
    category: "general",
    label: "Primary Domain",
  },
  {
    key: "ports.range_start",
    value: "4000",
    category: "ports",
    label: "Port Range Start",
  },
  {
    key: "ports.range_end",
    value: "9999",
    category: "ports",
    label: "Port Range End",
  },
];

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettingsByCategory(
  category: string
): Promise<SettingDefinition[]> {
  const settings = await prisma.setting.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });
  return settings.map((s) => ({
    key: s.key,
    value: s.value,
    category: s.category,
    label: s.label ?? s.key,
    description: s.description ?? undefined,
    isSecret: s.isSecret,
  }));
}

export async function getAllSettings(): Promise<
  Record<string, Record<string, string>>
> {
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  const grouped: Record<string, Record<string, string>> = {};

  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = {};
    grouped[s.category][s.key] = s.isSecret ? "••••••••" : s.value;
  }

  return grouped;
}

export async function updateSetting(
  key: string,
  value: string
): Promise<void> {
  const before = await prisma.setting.findUnique({ where: { key } });
  if (!before) throw new Error(`Setting not found: ${key}`);

  const after = await prisma.setting.update({
    where: { key },
    data: { value },
  });

  await createSnapshot("settings", { key, value: after.value });
  await writeAuditLog({
    action: "UPDATE",
    module: "settings",
    entityId: key,
    before: { key: before.key, value: before.value },
    after: { key: after.key, value: after.value },
  });
}

export async function seedDefaultSettings(): Promise<void> {
  for (const def of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: def.key },
      update: {},
      create: {
        key: def.key,
        value: def.value,
        category: def.category,
        label: def.label,
        description: def.description,
        isSecret: def.isSecret ?? false,
      },
    });
  }
}

export async function getPathSetting(key: string): Promise<string> {
  const value = await getSetting(key);
  if (!value) {
    const def = DEFAULT_SETTINGS.find((s) => s.key === key);
    if (def) return def.value;
    throw new Error(`Path setting not found: ${key}`);
  }
  return value;
}
