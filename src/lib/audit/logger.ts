import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { headers } from "next/headers";

export interface AuditEntry {
  action: string;
  module: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const session = await getSession();
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  await prisma.auditLog.create({
    data: {
      userId: session?.id,
      username: session?.username ?? "system",
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId,
      before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : undefined,
      after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : undefined,
      ipAddress,
    },
  });
}
