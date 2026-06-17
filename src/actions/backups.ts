"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireSession } from "@/lib/auth/session";
import {
  listBackups,
  createDatabaseBackup,
  restoreDatabaseBackup,
  deleteBackup,
  getBackupStats,
} from "@/lib/backups/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
  backupId?: string;
};

export async function getBackupsAction() {
  await requireSession();
  return listBackups();
}

export async function getBackupStatsAction() {
  await requireSession();
  return getBackupStats();
}

export async function createBackupAction(): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const { id } = await createDatabaseBackup(false);
    revalidatePath("/backups");
    return { success: true, backupId: id, output: "Backup completed" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Backup failed" };
  }
}

export async function restoreBackupAction(
  id: string
): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const output = await restoreDatabaseBackup(id);
    revalidatePath("/backups");
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restore failed" };
  }
}

export async function deleteBackupAction(
  id: string
): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    await deleteBackup(id);
    revalidatePath("/backups");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed" };
  }
}
