"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listTechnologies,
  createTechnology,
  updateTechnology,
  deleteTechnology,
} from "@/lib/technologies/service";
import type { TechnologyInput } from "@/lib/validations/crud";

export type CrudActionState = { success?: boolean; error?: string; id?: string };

export async function getTechnologiesAction() {
  await requireSession();
  return listTechnologies();
}

export async function createTechnologyAction(input: TechnologyInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const item = await createTechnology(input);
    revalidatePath("/technologies");
    revalidatePath("/applications");
    return { success: true, id: item.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateTechnologyAction(id: string, input: TechnologyInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateTechnology(id, input);
    revalidatePath("/technologies");
    revalidatePath("/applications");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteTechnologyAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteTechnology(id);
    revalidatePath("/technologies");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
