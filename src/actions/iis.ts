"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listIisSites,
  startIisSite,
  stopIisSite,
  restartIisSite,
  startAppPool,
  stopAppPool,
  recycleAppPool,
  linkIisToApplication,
} from "@/lib/iis/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
};

export async function getIisSitesAction() {
  await requireSession();
  return listIisSites();
}

export async function startIisSiteAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await startIisSite(name);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Start failed" };
  }
}

export async function stopIisSiteAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await stopIisSite(name);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stop failed" };
  }
}

export async function restartIisSiteAction(
  name: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await restartIisSite(name);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restart failed" };
  }
}

export async function startAppPoolAction(
  poolName: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await startAppPool(poolName);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Start pool failed" };
  }
}

export async function stopAppPoolAction(
  poolName: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await stopAppPool(poolName);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stop pool failed" };
  }
}

export async function recycleAppPoolAction(
  poolName: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await recycleAppPool(poolName);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Recycle failed" };
  }
}

export async function linkIisAction(
  siteId: string,
  applicationId: string | null
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await linkIisToApplication(siteId, applicationId);
    revalidatePath("/iis");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Link failed" };
  }
}
