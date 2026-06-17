import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { createSnapshot } from "@/lib/storage/snapshot";
import {
  domainSchema,
  emptyToNull,
  type DomainInput,
} from "@/lib/validations/crud";

function normalizeDomainInput(input: DomainInput) {
  const data = emptyToNull(input);
  return {
    hostname: data.hostname.toLowerCase(),
    subdomain: data.subdomain ?? null,
    sslEnabled: data.sslEnabled ?? false,
    proxyPass: data.proxyPass ?? null,
    rootPath: data.rootPath ?? null,
    targetPort: data.targetPort ?? null,
    nginxConfigPath: data.nginxConfigPath ?? null,
    applicationId: data.applicationId || null,
    discovered: false,
  };
}

export async function listDomains() {
  return prisma.domain.findMany({
    include: { application: { select: { id: true, name: true } } },
    orderBy: { hostname: "asc" },
  });
}

export async function getDomain(id: string) {
  return prisma.domain.findUnique({
    where: { id },
    include: { application: true },
  });
}

export async function createDomain(input: DomainInput) {
  const parsed = domainSchema.parse(input);
  const data = normalizeDomainInput(parsed);

  const existing = await prisma.domain.findUnique({
    where: { hostname: data.hostname },
  });
  if (existing) throw new Error(`Domain ${data.hostname} already exists`);

  const domain = await prisma.domain.create({ data });

  if (data.targetPort) {
    await prisma.port.upsert({
      where: { number: data.targetPort },
      update: { status: "IN_USE", applicationId: data.applicationId },
      create: {
        number: data.targetPort,
        status: "IN_USE",
        applicationId: data.applicationId,
        notes: `Linked to domain ${data.hostname}`,
      },
    });
  }

  await createSnapshot("domains", domain, domain.id);
  await writeAuditLog({
    action: "CREATE",
    module: "domains",
    entityId: domain.id,
    after: domain,
  });

  return domain;
}

export async function updateDomain(id: string, input: DomainInput) {
  const parsed = domainSchema.parse(input);
  const data = normalizeDomainInput(parsed);

  const before = await prisma.domain.findUnique({ where: { id } });
  if (!before) throw new Error("Domain not found");

  if (data.hostname !== before.hostname) {
    const conflict = await prisma.domain.findUnique({
      where: { hostname: data.hostname },
    });
    if (conflict) throw new Error(`Domain ${data.hostname} already exists`);
  }

  const after = await prisma.domain.update({
    where: { id },
    data: { ...data, discovered: before.discovered },
  });

  await createSnapshot("domains", after, id);
  await writeAuditLog({
    action: "UPDATE",
    module: "domains",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function deleteDomain(id: string) {
  const before = await prisma.domain.findUnique({ where: { id } });
  if (!before) throw new Error("Domain not found");

  await prisma.domain.delete({ where: { id } });

  await createSnapshot("domains", before, id);
  await writeAuditLog({
    action: "DELETE",
    module: "domains",
    entityId: id,
    before,
  });
}

export async function getDomainFormOptions() {
  return prisma.application.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
