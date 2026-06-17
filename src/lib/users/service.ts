import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { hashPassword } from "@/lib/auth/session";
import { userSchema, type UserInput } from "@/lib/validations/crud";

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(input: UserInput) {
  const parsed = userSchema.parse(input);
  if (!parsed.password) throw new Error("Password is required for new users");

  const existing = await prisma.user.findUnique({ where: { username: parsed.username } });
  if (existing) throw new Error(`Username "${parsed.username}" already exists`);

  const passwordHash = await hashPassword(parsed.password);
  const user = await prisma.user.create({
    data: {
      username: parsed.username,
      passwordHash,
      role: parsed.role,
      active: parsed.active ?? true,
    },
  });

  await writeAuditLog({
    action: "CREATE",
    module: "users",
    entityId: user.id,
    after: { id: user.id, username: user.username, role: user.role, active: user.active },
  });

  return user;
}

export async function updateUser(id: string, input: UserInput, currentUserId: string) {
  const parsed = userSchema.parse(input);
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("User not found");

  if (parsed.username !== before.username) {
    const conflict = await prisma.user.findUnique({ where: { username: parsed.username } });
    if (conflict) throw new Error(`Username "${parsed.username}" already exists`);
  }

  if (id === currentUserId && !parsed.active) {
    throw new Error("Cannot deactivate your own account");
  }

  const data: { username: string; role: typeof parsed.role; active: boolean; passwordHash?: string } = {
    username: parsed.username,
    role: parsed.role,
    active: parsed.active ?? true,
  };

  if (parsed.password) {
    data.passwordHash = await hashPassword(parsed.password);
  }

  const after = await prisma.user.update({ where: { id }, data });

  await writeAuditLog({
    action: "UPDATE",
    module: "users",
    entityId: id,
    before: { id: before.id, username: before.username, role: before.role, active: before.active },
    after: { id: after.id, username: after.username, role: after.role, active: after.active },
  });

  return after;
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new Error("Cannot delete your own account");

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("User not found");

  await prisma.user.delete({ where: { id } });

  await writeAuditLog({
    action: "DELETE",
    module: "users",
    entityId: id,
    before: { id: before.id, username: before.username, role: before.role },
  });
}
