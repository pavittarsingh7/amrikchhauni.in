"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  createPort,
  createPortAutoAssign,
  updatePort,
  deletePort,
  listPorts,
  getPortFormOptions,
  getPortStats,
  getNextAvailablePort,
} from "@/lib/ports/service";
import type { PortInput } from "@/lib/validations/crud";

export type CrudActionState = {
  success?: boolean;
  error?: string;
  id?: string;
  nextPort?: number;
};

export async function getPortsAction() {
  await requireSession();
  return listPorts();
}

export async function getPortStatsAction() {
  await requireSession();
  return getPortStats();
}

export async function getPortFormOptionsAction() {
  await requireSession();
  return getPortFormOptions();
}

export async function getNextAvailablePortAction(): Promise<CrudActionState> {
  try {
    await requireSession();
    const nextPort = await getNextAvailablePort();
    return { success: true, nextPort };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No ports available" };
  }
}

export async function createPortAction(
  input: PortInput
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const port = await createPort(input);
    revalidatePath("/ports");
    revalidatePath("/dashboard");
    return { success: true, id: port.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create" };
  }
}

export async function createPortAutoAssignAction(
  applicationId?: string
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const port = await createPortAutoAssign(applicationId);
    revalidatePath("/ports");
    return { success: true, id: port.id, nextPort: port.number };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to assign port" };
  }
}

export async function updatePortAction(
  id: string,
  input: PortInput
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updatePort(id, input);
    revalidatePath("/ports");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update" };
  }
}

export async function deletePortAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deletePort(id);
    revalidatePath("/ports");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete" };
  }
}
