import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";
import {
  applicationSchema,
  emptyToNull,
  type ApplicationInput,
} from "@/lib/validations/crud";

function normalizeApplicationInput(input: ApplicationInput) {
  const data = emptyToNull(input);
  return {
    name: data.name,
    description: data.description ?? null,
    clientId: data.clientId || null,
    ideaSourceId: data.ideaSourceId || null,
    technologyId: data.technologyId || null,
    deploymentTypeId: data.deploymentTypeId || null,
    repositoryUrl: data.repositoryUrl || null,
    branch: data.branch || "main",
    projectPath: data.projectPath ?? null,
    buildCommand: data.buildCommand ?? null,
    startCommand: data.startCommand ?? null,
    status: data.status,
    notes: data.notes ?? null,
    remarks: data.remarks ?? null,
    featured: data.featured ?? false,
  };
}

export async function listApplications() {
  return prisma.application.findMany({
    include: {
      technology: true,
      deploymentType: true,
      ideaSource: true,
      client: true,
      _count: { select: { domains: true, ports: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      technology: true,
      deploymentType: true,
      ideaSource: true,
      client: true,
      domains: true,
      ports: true,
    },
  });
}

export async function createApplication(
  input: ApplicationInput,
  createdById: string
) {
  const parsed = applicationSchema.parse(input);
  const data = normalizeApplicationInput(parsed);

  const app = await prisma.application.create({
    data: { ...data, createdById },
  });

  await createSnapshot("applications", app, app.id);
  await writeAuditLog({
    action: "CREATE",
    module: "applications",
    entityId: app.id,
    after: app,
  });

  return app;
}

export async function updateApplication(id: string, input: ApplicationInput) {
  const parsed = applicationSchema.parse(input);
  const data = normalizeApplicationInput(parsed);

  const before = await prisma.application.findUnique({ where: { id } });
  if (!before) throw new Error("Application not found");

  const after = await prisma.application.update({
    where: { id },
    data,
  });

  await createSnapshot("applications", after, id);
  await writeAuditLog({
    action: "UPDATE",
    module: "applications",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function deleteApplication(id: string) {
  const before = await prisma.application.findUnique({ where: { id } });
  if (!before) throw new Error("Application not found");

  await prisma.application.delete({ where: { id } });

  await createSnapshot("applications", before, id);
  await writeAuditLog({
    action: "DELETE",
    module: "applications",
    entityId: id,
    before,
  });
}

export async function getApplicationFormOptions() {
  const [clients, ideaSources, technologies, deploymentTypes] =
    await Promise.all([
      prisma.client.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.ideaSource.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.technology.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.deploymentType.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return { clients, ideaSources, technologies, deploymentTypes };
}
