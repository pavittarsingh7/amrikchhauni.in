"use server";

import { revalidatePath } from "next/cache";
import {
  requireWriteAccess,
  requireSuperAdmin,
  requireSession,
} from "@/lib/auth/session";
import {
  getMaintenanceStatus,
  updateMaintenancePage,
  setSiteMaintenance,
  setServerMaintenance,
} from "@/lib/maintenance/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
};

async function canAutoReload() {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function getMaintenanceStatusAction() {
  await requireSession();
  return getMaintenanceStatus();
}

export async function updateMaintenancePageAction(input: {
  title: string;
  description?: string;
  expectedReturn?: string;
  logoPath?: string;
}): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await updateMaintenancePage(input);
    revalidatePath("/maintenance");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function toggleSiteMaintenanceAction(
  domainId: string,
  enabled: boolean
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const autoReload = await canAutoReload();
    await setSiteMaintenance(domainId, enabled, { autoReload });
    revalidatePath("/maintenance");
    return {
      success: true,
      output: autoReload
        ? `Maintenance ${enabled ? "enabled" : "disabled"} and nginx reloaded`
        : `Maintenance ${enabled ? "enabled" : "disabled"}. Super Admin must reload nginx.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function toggleServerMaintenanceAction(
  enabled: boolean
): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    await setServerMaintenance(enabled, { autoReload: true });
    revalidatePath("/maintenance");
    return {
      success: true,
      output: `Server-wide maintenance ${enabled ? "enabled" : "disabled"}`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
