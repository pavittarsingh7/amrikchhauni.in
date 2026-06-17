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
  previewSiteMaintenance,
  previewServerMaintenance,
  type MaintenancePreview,
} from "@/lib/maintenance/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
};

export type MaintenancePreviewState = {
  success?: boolean;
  error?: string;
  previews?: MaintenancePreview[];
  preview?: MaintenancePreview;
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

export async function previewSiteMaintenanceAction(
  domainId: string,
  enabled: boolean
): Promise<MaintenancePreviewState> {
  try {
    await requireWriteAccess();
    const preview = await previewSiteMaintenance(domainId, enabled);
    return { success: true, preview };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Preview failed" };
  }
}

export async function previewServerMaintenanceAction(
  enabled: boolean
): Promise<MaintenancePreviewState> {
  try {
    await requireSuperAdmin();
    const previews = await previewServerMaintenance(enabled);
    return { success: true, previews };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Preview failed" };
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
