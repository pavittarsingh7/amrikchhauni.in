import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { technologySchema, emptyToNull, type TechnologyInput } from "@/lib/validations/crud";

function normalize(input: TechnologyInput) {
  const data = emptyToNull(input);
  return {
    name: data.name,
    description: data.description ?? null,
    active: data.active ?? true,
  };
}

export async function listTechnologies() {
  return prisma.technology.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createTechnology(input: TechnologyInput) {
  const data = normalize(technologySchema.parse(input));
  const existing = await prisma.technology.findUnique({ where: { name: data.name } });
  if (existing) throw new Error(`Technology "${data.name}" already exists`);
  const item = await prisma.technology.create({ data });
  await writeAuditLog({ action: "CREATE", module: "technologies", entityId: item.id, after: item });
  return item;
}

export async function updateTechnology(id: string, input: TechnologyInput) {
  const data = normalize(technologySchema.parse(input));
  const before = await prisma.technology.findUnique({ where: { id } });
  if (!before) throw new Error("Technology not found");
  if (data.name !== before.name) {
    const conflict = await prisma.technology.findUnique({ where: { name: data.name } });
    if (conflict) throw new Error(`Technology "${data.name}" already exists`);
  }
  const after = await prisma.technology.update({ where: { id }, data });
  await writeAuditLog({ action: "UPDATE", module: "technologies", entityId: id, before, after });
  return after;
}

export async function deleteTechnology(id: string) {
  const before = await prisma.technology.findUnique({ where: { id } });
  if (!before) throw new Error("Technology not found");
  const linked = await prisma.application.count({ where: { technologyId: id } });
  if (linked > 0) throw new Error(`Technology has ${linked} linked application(s)`);
  await prisma.technology.delete({ where: { id } });
  await writeAuditLog({ action: "DELETE", module: "technologies", entityId: id, before });
}
