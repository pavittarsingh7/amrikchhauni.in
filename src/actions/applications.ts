"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  listApplications,
  getApplicationFormOptions,
} from "@/lib/applications/service";
import type { ApplicationInput } from "@/lib/validations/crud";

export type CrudActionState = {
  success?: boolean;
  error?: string;
  id?: string;
};

export async function getApplicationsAction() {
  await requireSession();
  return listApplications();
}

export async function getApplicationFormOptionsAction() {
  await requireSession();
  return getApplicationFormOptions();
}

export async function createApplicationAction(
  input: ApplicationInput
): Promise<CrudActionState> {
  try {
    const session = await requireWriteAccess();
    const app = await createApplication(input, session.id);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true, id: app.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create" };
  }
}

export async function updateApplicationAction(
  id: string,
  input: ApplicationInput
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateApplication(id, input);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update" };
  }
}

export async function deleteApplicationAction(
  id: string
): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteApplication(id);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete" };
  }
}
