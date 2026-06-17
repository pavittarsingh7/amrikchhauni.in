import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";
import { getPathSetting } from "@/lib/settings/service";

const execFileAsync = promisify(execFile);

interface PgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

function parseDatabaseUrl(url: string): PgConnection {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "").split("?")[0],
  };
}

async function getPgDumpPath(): Promise<string> {
  return getPathSetting("paths.pg_dump");
}

async function getBackupDir(): Promise<string> {
  const root = await getPathSetting("paths.backups");
  return path.join(root, "database");
}

export async function listBackups() {
  return prisma.backup.findMany({
    where: { type: "DATABASE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDatabaseBackup(
  scheduled = false
): Promise<{ id: string; filepath: string }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not configured");

  const conn = parseDatabaseUrl(dbUrl);
  const pgDump = await getPgDumpPath();
  const backupDir = await getBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `acdm_${conn.database}_${timestamp}.sql`;
  const filepath = path.join(backupDir, filename);

  const backup = await prisma.backup.create({
    data: {
      type: "DATABASE",
      status: "IN_PROGRESS",
      filename,
      filepath,
      scheduled,
    },
  });

  try {
    const env = {
      ...process.env,
      PGPASSWORD: conn.password,
    };

    const { stdout } = await execFileAsync(
      pgDump,
      [
        "-h",
        conn.host,
        "-p",
        conn.port,
        "-U",
        conn.user,
        "-d",
        conn.database,
        "-F",
        "p",
        "-f",
        filepath,
        "--no-owner",
        "--no-acl",
      ],
      { env, timeout: 600_000, windowsHide: true }
    );

    const stat = await fs.stat(filepath);
    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        sizeBytes: BigInt(stat.size),
        completedAt: new Date(),
      },
    });

    await createSnapshot("settings", { backupId: backup.id, filename }, backup.id);
    await writeAuditLog({
      action: "BACKUP",
      module: "backups",
      entityId: backup.id,
      after: { filename, sizeBytes: stat.size },
    });

    return { id: backup.id, filepath };
  } catch (err) {
    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Backup failed",
      },
    });
    throw err;
  }
}

export async function getBackupForDownload(id: string) {
  const backup = await prisma.backup.findUnique({ where: { id } });
  if (!backup || backup.status !== "COMPLETED") {
    throw new Error("Backup not found or not completed");
  }

  const exists = await fs
    .access(backup.filepath)
    .then(() => true)
    .catch(() => false);
  if (!exists) throw new Error("Backup file missing on disk");

  return backup;
}

export async function restoreDatabaseBackup(id: string): Promise<string> {
  const backup = await getBackupForDownload(id);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not configured");

  const conn = parseDatabaseUrl(dbUrl);
  const psqlPath = (await getPgDumpPath()).replace("pg_dump.exe", "psql.exe");

  const env = {
    ...process.env,
    PGPASSWORD: conn.password,
  };

  await execFileAsync(
    psqlPath,
    [
      "-h",
      conn.host,
      "-p",
      conn.port,
      "-U",
      conn.user,
      "-d",
      conn.database,
      "-f",
      backup.filepath,
    ],
    { env, timeout: 600_000, windowsHide: true }
  );

  await writeAuditLog({
    action: "RESTORE",
    module: "backups",
    entityId: id,
    after: { filename: backup.filename },
  });

  return `Restored from ${backup.filename}`;
}

export async function deleteBackup(id: string): Promise<void> {
  const backup = await prisma.backup.findUnique({ where: { id } });
  if (!backup) throw new Error("Backup not found");

  await fs.unlink(backup.filepath).catch(() => {});
  await prisma.backup.delete({ where: { id } });

  await writeAuditLog({
    action: "DELETE",
    module: "backups",
    entityId: id,
    before: { filename: backup.filename },
  });
}

export async function getBackupStats() {
  const [total, completed, failed, latest] = await Promise.all([
    prisma.backup.count({ where: { type: "DATABASE" } }),
    prisma.backup.count({ where: { type: "DATABASE", status: "COMPLETED" } }),
    prisma.backup.count({ where: { type: "DATABASE", status: "FAILED" } }),
    prisma.backup.findFirst({
      where: { type: "DATABASE", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { total, completed, failed, latest };
}
