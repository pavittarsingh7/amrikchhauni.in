import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { clientSchema, emptyToNull, type ClientInput } from "@/lib/validations/crud";

function normalize(input: ClientInput) {
  const data = emptyToNull(input);
  return {
    name: data.name,
    company: data.company ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    active: data.active ?? true,
  };
}

export async function listClients() {
  return prisma.client.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createClient(input: ClientInput) {
  const data = normalize(clientSchema.parse(input));
  const client = await prisma.client.create({ data });
  await writeAuditLog({ action: "CREATE", module: "clients", entityId: client.id, after: client });
  return client;
}

export async function updateClient(id: string, input: ClientInput) {
  const data = normalize(clientSchema.parse(input));
  const before = await prisma.client.findUnique({ where: { id } });
  if (!before) throw new Error("Client not found");
  const after = await prisma.client.update({ where: { id }, data });
  await writeAuditLog({ action: "UPDATE", module: "clients", entityId: id, before, after });
  return after;
}

export async function deleteClient(id: string) {
  const before = await prisma.client.findUnique({ where: { id } });
  if (!before) throw new Error("Client not found");
  const linked = await prisma.application.count({ where: { clientId: id } });
  if (linked > 0) throw new Error(`Client has ${linked} linked application(s)`);
  await prisma.client.delete({ where: { id } });
  await writeAuditLog({ action: "DELETE", module: "clients", entityId: id, before });
}
