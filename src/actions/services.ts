"use server";

import { revalidatePath } from "next/cache";
import {
  requireWriteAccess,
  requireSuperAdmin,
  requireSession,
} from "@/lib/auth/session";
import {
  listWindowsServices,
  syncWindowsServices,
  startWindowsService,
  stopWindowsService,
  restartWindowsService,
  setServiceWhitelist,
} from "@/lib/windows-services/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
};

export async function getWindowsServicesAction() {
  await requireSession();
  return listWindowsServices();
}

export async function syncWindowsServicesAction(): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await syncWindowsServices();
    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function startServiceAction(
  name: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await startWindowsService(name);
    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Start failed" };
  }
}

export async function stopServiceAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await stopWindowsService(name);
    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stop failed" };
  }
}

export async function restartServiceAction(
  name: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await restartWindowsService(name);
    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restart failed" };
  }
}

export async function toggleServiceWhitelistAction(
  name: string,
  whitelisted: boolean
): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    await setServiceWhitelist(name, whitelisted);
    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
