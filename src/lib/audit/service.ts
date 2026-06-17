import { prisma } from "@/lib/db/prisma";

export interface AuditLogFilters {
  module?: string;
  action?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.search
      ? {
          OR: [
            { username: { contains: filters.search, mode: "insensitive" as const } },
            { module: { contains: filters.search, mode: "insensitive" as const } },
            { action: { contains: filters.search, mode: "insensitive" as const } },
            { entityId: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        username: true,
        action: true,
        module: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAuditLog(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, role: true } } },
  });
}

export async function getAuditFilterOptions() {
  const [modules, actions] = await Promise.all([
    prisma.auditLog.findMany({
      distinct: ["module"],
      select: { module: true },
      orderBy: { module: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return {
    modules: modules.map((m) => m.module),
    actions: actions.map((a) => a.action),
  };
}

export async function getRecentAuditLogs(limit = 10) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      username: true,
      action: true,
      module: true,
      entityId: true,
      createdAt: true,
    },
  });
}

export async function getAuditStatsByModule(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.auditLog.groupBy({
    by: ["module"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return logs.map((l) => ({ module: l.module, count: l._count.id }));
}
