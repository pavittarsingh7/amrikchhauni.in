"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listPm2Processes,
  pm2Start,
  pm2Stop,
  pm2Restart,
  pm2Delete,
  pm2Save,
  linkPm2ToApplication,
  getPm2Logs,
} from "@/lib/pm2/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
};

export async function getPm2ProcessesAction() {
  await requireSession();
  return listPm2Processes();
}

export async function pm2StartAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await pm2Start(name);
    revalidatePath("/pm2");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Start failed" };
  }
}

export async function pm2StopAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await pm2Stop(name);
    revalidatePath("/pm2");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stop failed" };
  }
}

export async function pm2RestartAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await pm2Restart(name);
    revalidatePath("/pm2");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restart failed" };
  }
}

export async function pm2DeleteAction(name: string): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await pm2Delete(name);
    revalidatePath("/pm2");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed" };
  }
}

export async function pm2SaveAction(): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await pm2Save();
    return { success: true, output: "PM2 process list saved" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function linkPm2Action(
  processId: string,
  applicationId: string | null
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    await linkPm2ToApplication(processId, applicationId);
    revalidatePath("/pm2");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Link failed" };
  }
}

export async function getPm2LogsAction(name: string): Promise<InfraActionState> {
  try {
    await requireSession();
    const output = await getPm2Logs(name);
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to get logs" };
  }
}
