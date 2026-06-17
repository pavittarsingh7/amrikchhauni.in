import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";

export type SnapshotEntity =
  | "applications"
  | "domains"
  | "ports"
  | "settings"
  | "nginx"
  | "ssl";

const DEFAULT_CONFIG_ROOT = "D:\\server-config";

export async function getConfigRoot(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: "paths.config_root" },
  });
  return setting?.value ?? DEFAULT_CONFIG_ROOT;
}

export async function ensureStorageDirs(): Promise<void> {
  const root = await getConfigRoot();
  const dirs = [
    "backups/database",
    "backups/nginx",
    "backups/ssl",
    "backups/settings",
    "storage/config",
    "storage/exports",
    "storage/imports",
    "snapshots/applications",
    "snapshots/domains",
    "snapshots/ports",
    "snapshots/settings",
    "maintenance",
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(root, dir), { recursive: true });
  }
}

export async function createSnapshot(
  entity: SnapshotEntity,
  data: unknown,
  entityId?: string
): Promise<string> {
  const root = await getConfigRoot();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = entityId
    ? `${entityId}_${timestamp}.json`
    : `snapshot_${timestamp}.json`;
  const filepath = path.join(root, "snapshots", entity, filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");

  await prisma.snapshot.create({
    data: { entity, entityId, filepath },
  });

  return filepath;
}

export async function saveWithSnapshot<T extends { id: string }>(
  entity: SnapshotEntity,
  data: T,
  saveFn: () => Promise<T>
): Promise<T> {
  const result = await saveFn();
  await createSnapshot(entity, data, data.id);
  return result;
}

export async function readJsonFile<T>(filepath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(
  filepath: string,
  data: unknown
): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}
