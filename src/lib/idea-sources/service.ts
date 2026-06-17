import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { ideaSourceSchema, emptyToNull, type IdeaSourceInput } from "@/lib/validations/crud";

function normalize(input: IdeaSourceInput) {
  const data = emptyToNull(input);
  return {
    name: data.name,
    description: data.description ?? null,
    active: data.active ?? true,
  };
}

export async function listIdeaSources() {
  return prisma.ideaSource.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createIdeaSource(input: IdeaSourceInput) {
  const data = normalize(ideaSourceSchema.parse(input));
  const existing = await prisma.ideaSource.findUnique({ where: { name: data.name } });
  if (existing) throw new Error(`Idea source "${data.name}" already exists`);
  const item = await prisma.ideaSource.create({ data });
  await writeAuditLog({ action: "CREATE", module: "idea-sources", entityId: item.id, after: item });
  return item;
}

export async function updateIdeaSource(id: string, input: IdeaSourceInput) {
  const data = normalize(ideaSourceSchema.parse(input));
  const before = await prisma.ideaSource.findUnique({ where: { id } });
  if (!before) throw new Error("Idea source not found");
  if (data.name !== before.name) {
    const conflict = await prisma.ideaSource.findUnique({ where: { name: data.name } });
    if (conflict) throw new Error(`Idea source "${data.name}" already exists`);
  }
  const after = await prisma.ideaSource.update({ where: { id }, data });
  await writeAuditLog({ action: "UPDATE", module: "idea-sources", entityId: id, before, after });
  return after;
}

export async function deleteIdeaSource(id: string) {
  const before = await prisma.ideaSource.findUnique({ where: { id } });
  if (!before) throw new Error("Idea source not found");
  const linked = await prisma.application.count({ where: { ideaSourceId: id } });
  if (linked > 0) throw new Error(`Idea source has ${linked} linked application(s)`);
  await prisma.ideaSource.delete({ where: { id } });
  await writeAuditLog({ action: "DELETE", module: "idea-sources", entityId: id, before });
}
