import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";
import { getSetting } from "@/lib/settings/service";
import {
  portSchema,
  emptyToNull,
  type PortInput,
} from "@/lib/validations/crud";

function normalizePortInput(input: PortInput) {
  const data = emptyToNull(input);
  return {
    number: data.number,
    status: data.status,
    applicationId: data.applicationId || null,
    notes: data.notes ?? null,
  };
}

export async function listPorts() {
  return prisma.port.findMany({
    include: { application: { select: { id: true, name: true } } },
    orderBy: { number: "asc" },
  });
}

export async function getPort(id: string) {
  return prisma.port.findUnique({
    where: { id },
    include: { application: true },
  });
}

export async function getNextAvailablePort(): Promise<number> {
  const rangeStart = parseInt(
    (await getSetting("ports.range_start")) ?? "4000",
    10
  );
  const rangeEnd = parseInt((await getSetting("ports.range_end")) ?? "9999", 10);

  const usedPorts = await prisma.port.findMany({
    select: { number: true },
  });
  const usedSet = new Set(usedPorts.map((p) => p.number));

  for (let port = rangeStart; port <= rangeEnd; port++) {
    if (!usedSet.has(port)) return port;
  }

  throw new Error(`No available ports in range ${rangeStart}-${rangeEnd}`);
}

export async function createPort(input: PortInput) {
  const parsed = portSchema.parse(input);
  const data = normalizePortInput(parsed);

  const existing = await prisma.port.findUnique({
    where: { number: data.number },
  });
  if (existing) throw new Error(`Port ${data.number} is already registered`);

  const port = await prisma.port.create({ data });

  await createSnapshot("ports", port, port.id);
  await writeAuditLog({
    action: "CREATE",
    module: "ports",
    entityId: port.id,
    after: port,
  });

  return port;
}

export async function createPortAutoAssign(
  applicationId?: string,
  status: PortInput["status"] = "RESERVED"
) {
  const number = await getNextAvailablePort();
  return createPort({
    number,
    status,
    applicationId: applicationId ?? null,
    notes: "Auto-assigned",
  });
}

export async function updatePort(id: string, input: PortInput) {
  const parsed = portSchema.parse(input);
  const data = normalizePortInput(parsed);

  const before = await prisma.port.findUnique({ where: { id } });
  if (!before) throw new Error("Port not found");

  if (data.number !== before.number) {
    const conflict = await prisma.port.findUnique({
      where: { number: data.number },
    });
    if (conflict) throw new Error(`Port ${data.number} is already registered`);
  }

  const after = await prisma.port.update({
    where: { id },
    data,
  });

  await createSnapshot("ports", after, id);
  await writeAuditLog({
    action: "UPDATE",
    module: "ports",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function deletePort(id: string) {
  const before = await prisma.port.findUnique({ where: { id } });
  if (!before) throw new Error("Port not found");

  await prisma.port.delete({ where: { id } });

  await createSnapshot("ports", before, id);
  await writeAuditLog({
    action: "DELETE",
    module: "ports",
    entityId: id,
    before,
  });
}

export async function getPortFormOptions() {
  return prisma.application.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getPortStats() {
  const counts = await prisma.port.groupBy({
    by: ["status"],
    _count: true,
  });

  return {
    total: counts.reduce((sum, c) => sum + c._count, 0),
    inUse: counts.find((c) => c.status === "IN_USE")?._count ?? 0,
    available: counts.find((c) => c.status === "AVAILABLE")?._count ?? 0,
    reserved: counts.find((c) => c.status === "RESERVED")?._count ?? 0,
    underConstruction:
      counts.find((c) => c.status === "UNDER_CONSTRUCTION")?._count ?? 0,
  };
}
