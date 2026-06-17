import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { execPm2 } from "@/lib/shell/exec";
import { persistPm2Discovery } from "@/lib/discovery/persist";

export async function listPm2Processes() {
  return prisma.pm2Process.findMany({
    include: { application: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

async function refreshDiscovery() {
  try {
    await persistPm2Discovery();
  } catch {
    // non-fatal
  }
}

export async function pm2Start(name: string) {
  await execPm2(["start", name]);
  await writeAuditLog({ action: "START", module: "pm2", entityId: name });
  await refreshDiscovery();
}

export async function pm2Stop(name: string) {
  await execPm2(["stop", name]);
  await writeAuditLog({ action: "STOP", module: "pm2", entityId: name });
  await refreshDiscovery();
}

export async function pm2Restart(name: string) {
  await execPm2(["restart", name]);
  await writeAuditLog({ action: "RESTART", module: "pm2", entityId: name });
  await refreshDiscovery();
}

export async function pm2Delete(name: string) {
  await execPm2(["delete", name]);
  await prisma.pm2Process.deleteMany({ where: { name } });
  await writeAuditLog({ action: "DELETE", module: "pm2", entityId: name });
}

export async function pm2Save() {
  await execPm2(["save"]);
  await writeAuditLog({ action: "SAVE", module: "pm2" });
}

export async function linkPm2ToApplication(
  processId: string,
  applicationId: string | null
) {
  const before = await prisma.pm2Process.findUnique({ where: { id: processId } });
  if (!before) throw new Error("Process not found");

  const after = await prisma.pm2Process.update({
    where: { id: processId },
    data: { applicationId },
  });

  await writeAuditLog({
    action: "LINK",
    module: "pm2",
    entityId: processId,
    before: { applicationId: before.applicationId },
    after: { applicationId },
  });

  return after;
}

export async function getPm2Logs(name: string, lines = 50): Promise<string> {
  try {
    return await execPm2(["logs", name, "--lines", String(lines), "--nostream"]);
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to fetch logs";
  }
}
