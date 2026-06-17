"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/clients/service";
import type { ClientInput } from "@/lib/validations/crud";

export type CrudActionState = { success?: boolean; error?: string; id?: string };

export async function getClientsAction() {
  await requireSession();
  return listClients();
}

export async function createClientAction(input: ClientInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const client = await createClient(input);
    revalidatePath("/clients");
    revalidatePath("/applications");
    return { success: true, id: client.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateClientAction(id: string, input: ClientInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateClient(id, input);
    revalidatePath("/clients");
    revalidatePath("/applications");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteClientAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteClient(id);
    revalidatePath("/clients");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
