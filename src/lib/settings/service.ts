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
  {
    key: "git.auth_mode",
    value: "none",
    category: "git",
    label: "Git Auth Mode",
    description:
      "none = use machine credentials/SSH only. https_token = use a Personal Access Token for private HTTPS remotes (recommended for PM2).",
  },
  {
    key: "git.https_username",
    value: "x-access-token",
    category: "git",
    label: "HTTPS Username",
    description:
      "GitHub: x-access-token. GitLab: oauth2 or your username. Azure DevOps: any non-empty username.",
  },
  {
    key: "git.https_token",
    value: "",
    category: "git",
    label: "HTTPS Token (PAT)",
    description:
      "Personal Access Token with read access to private repositories. Never commit this value. Stored as a secret setting.",
    isSecret: true,
  },
];

/** Placeholder shown in the Settings UI for secret values that already exist. */
export const SECRET_PLACEHOLDER = "••••••••";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettingsByCategory(
  category: string
): Promise<SettingDefinition[]> {
  await ensureDefaultSettings();
  const settings = await prisma.setting.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });
  return settings.map((s) => ({
    key: s.key,
    // Never send raw secrets to the browser; Super Admin pastes a new value to rotate.
    value: s.isSecret ? (s.value ? SECRET_PLACEHOLDER : "") : s.value,
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
    grouped[s.category][s.key] = s.isSecret ? SECRET_PLACEHOLDER : s.value;
  }

  return grouped;
}

export async function updateSetting(
  key: string,
  value: string
): Promise<void> {
  const before = await prisma.setting.findUnique({ where: { key } });
  if (!before) throw new Error(`Setting not found: ${key}`);

  // Keep existing secret when the UI posts the masked placeholder or an empty rotate skip.
  if (before.isSecret && (value === SECRET_PLACEHOLDER || value === "")) {
    return;
  }

  const after = await prisma.setting.update({
    where: { key },
    data: { value },
  });

  const snapshotValue = before.isSecret ? SECRET_PLACEHOLDER : after.value;
  await createSnapshot("settings", { key, value: snapshotValue });
  await writeAuditLog({
    action: "UPDATE",
    module: "settings",
    entityId: key,
    before: {
      key: before.key,
      value: before.isSecret ? SECRET_PLACEHOLDER : before.value,
    },
    after: {
      key: after.key,
      value: before.isSecret ? SECRET_PLACEHOLDER : after.value,
    },
  });
}

export async function seedDefaultSettings(): Promise<void> {
  await ensureDefaultSettings();
}

/** Create any missing default settings without overwriting existing values. */
export async function ensureDefaultSettings(): Promise<void> {
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
