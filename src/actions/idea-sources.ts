"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  listIdeaSources,
  createIdeaSource,
  updateIdeaSource,
  deleteIdeaSource,
} from "@/lib/idea-sources/service";
import type { IdeaSourceInput } from "@/lib/validations/crud";

export type CrudActionState = { success?: boolean; error?: string; id?: string };

export async function getIdeaSourcesAction() {
  await requireSession();
  return listIdeaSources();
}

export async function createIdeaSourceAction(input: IdeaSourceInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    const item = await createIdeaSource(input);
    revalidatePath("/idea-sources");
    revalidatePath("/applications");
    return { success: true, id: item.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateIdeaSourceAction(id: string, input: IdeaSourceInput): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await updateIdeaSource(id, input);
    revalidatePath("/idea-sources");
    revalidatePath("/applications");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteIdeaSourceAction(id: string): Promise<CrudActionState> {
  try {
    await requireWriteAccess();
    await deleteIdeaSource(id);
    revalidatePath("/idea-sources");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
