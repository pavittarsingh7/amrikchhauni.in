"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/users/service";
import type { UserInput } from "@/lib/validations/crud";

export type CrudActionState = { success?: boolean; error?: string; id?: string };

export async function getUsersAction() {
  await requireSuperAdmin();
  return listUsers();
}

export async function createUserAction(input: UserInput): Promise<CrudActionState> {
  try {
    await requireSuperAdmin();
    const user = await createUser(input);
    revalidatePath("/users");
    return { success: true, id: user.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateUserAction(id: string, input: UserInput): Promise<CrudActionState> {
  try {
    const session = await requireSuperAdmin();
    await updateUser(id, input, session.id);
    revalidatePath("/users");
    return { success: true, id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteUserAction(id: string): Promise<CrudActionState> {
  try {
    const session = await requireSuperAdmin();
    await deleteUser(id, session.id);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
