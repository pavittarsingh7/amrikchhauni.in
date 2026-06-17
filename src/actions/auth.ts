"use server";

import { redirect } from "next/navigation";
import {
  authenticateUser,
  createSession,
  destroySession,
  requireSuperAdmin,
  requireWriteAccess,
} from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/logger";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const user = await authenticateUser(
    parsed.data.username,
    parsed.data.password
  );

  if (!user) {
    return { error: "Invalid username or password" };
  }

  await createSession(user);
  await writeAuditLog({
    action: "LOGIN",
    module: "auth",
    after: { username: user.username },
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await writeAuditLog({ action: "LOGOUT", module: "auth" });
  await destroySession();
  redirect("/login");
}

export async function requireAuthAction() {
  return requireWriteAccess();
}

export async function requireSuperAdminAction() {
  return requireSuperAdmin();
}
