import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { serverSchema, emptyToNull, type ServerInput } from "@/lib/validations/crud";

function normalize(input: ServerInput) {
  const data = emptyToNull(input);
  return {
    name: data.name,
    hostname: data.hostname,
    ipAddress: data.ipAddress ?? null,
    operatingSystem: data.operatingSystem ?? null,
    environment: data.environment ?? "production",
    active: data.active ?? true,
    isCurrent: data.isCurrent ?? false,
  };
}

export async function listServers() {
  return prisma.server.findMany({ orderBy: [{ isCurrent: "desc" }, { name: "asc" }] });
}

export async function createServer(input: ServerInput) {
  const data = normalize(serverSchema.parse(input));

  if (data.isCurrent) {
    await prisma.server.updateMany({ data: { isCurrent: false } });
  }

  const server = await prisma.server.create({ data });
  await writeAuditLog({ action: "CREATE", module: "servers", entityId: server.id, after: server });
  return server;
}

export async function updateServer(id: string, input: ServerInput) {
  const data = normalize(serverSchema.parse(input));
  const before = await prisma.server.findUnique({ where: { id } });
  if (!before) throw new Error("Server not found");

  if (data.isCurrent) {
    await prisma.server.updateMany({
      where: { id: { not: id } },
      data: { isCurrent: false },
    });
  }

  const after = await prisma.server.update({ where: { id }, data });
  await writeAuditLog({ action: "UPDATE", module: "servers", entityId: id, before, after });
  return after;
}

export async function deleteServer(id: string) {
  const before = await prisma.server.findUnique({ where: { id } });
  if (!before) throw new Error("Server not found");
  if (before.isCurrent) throw new Error("Cannot delete the current server");
  await prisma.server.delete({ where: { id } });
  await writeAuditLog({ action: "DELETE", module: "servers", entityId: id, before });
}

export async function getDeploymentOverview() {
  const [deploymentTypes, applications] = await Promise.all([
    prisma.deploymentType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { applications: true } } },
    }),
    prisma.application.findMany({
      include: {
        deploymentType: true,
        technology: true,
        client: true,
        _count: { select: { domains: true, ports: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return { deploymentTypes, applications };
}
