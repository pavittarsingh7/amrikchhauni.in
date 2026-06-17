"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  createDomain,
  updateDomain,
  deleteDomain,
  listDomains,
  getDomainFormOptions,
} from "@/lib/domains/service";
import type { DomainInput } from "@/lib/validations/crud";

export type CrudActionState = {
  success?: boolean;
  error?: string;
  id?: string;
};

export async function getDomainsAction() {
  await requireSession();
  return listDomains();
}

export async function getDomainFormOptionsAction() {
  await requireSession();
  return getDomainFormOptions();
}

export async function createDomainAction(
  input: DomainInput
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const domain = await createDomain(input);
    revalidatePath("/domains");
    revalidatePath("/ports");
    return { success: true, id: domain.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create" };
  }
}

export async function updateDomainAction(
  id: string,
  input: DomainInput
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateDomain(id, input);
    revalidatePath("/domains");
    revalidatePath("/ports");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update" };
  }
}

export async function deleteDomainAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteDomain(id);
    revalidatePath("/domains");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete" };
  }
}
