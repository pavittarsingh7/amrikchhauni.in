"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listServers,
  createServer,
  updateServer,
  deleteServer,
  getDeploymentOverview,
} from "@/lib/servers/service";
import type { ServerInput } from "@/lib/validations/crud";

export type CrudActionState = { success?: boolean; error?: string; id?: string };

export async function getServersAction() {
  await requireSession();
  return listServers();
}

export async function getDeploymentOverviewAction() {
  await requireSession();
  return getDeploymentOverview();
}

export async function createServerAction(input: ServerInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const server = await createServer(input);
    revalidatePath("/servers");
    return { success: true, id: server.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateServerAction(id: string, input: ServerInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateServer(id, input);
    revalidatePath("/servers");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteServerAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteServer(id);
    revalidatePath("/servers");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
