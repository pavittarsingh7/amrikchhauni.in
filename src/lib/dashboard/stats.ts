import { prisma } from "@/lib/db/prisma";
import { getRecentAuditLogs, getAuditStatsByModule } from "@/lib/audit/service";
import { getBackupStats } from "@/lib/backups/service";

export async function getDashboardStats() {
  const now = new Date();
  const sslWarningDate = new Date();
  sslWarningDate.setDate(sslWarningDate.getDate() + 30);

  const [
    applications,
    domains,
    ports,
    users,
    nginxConfigs,
    pm2Processes,
    iisSites,
    sslTotal,
    sslExpiring,
    sslExpired,
    pendingSuggestions,
    maintenanceEnabled,
    whitelistedServices,
    backupStats,
    recentAudit,
    auditByModule,
    appsByStatus,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.domain.count(),
    prisma.port.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.nginxConfig.count(),
    prisma.pm2Process.count(),
    prisma.iisSite.count(),
    prisma.sslCertificate.count(),
    prisma.sslCertificate.count({
      where: { notAfter: { lte: sslWarningDate, gt: now } },
    }),
    prisma.sslCertificate.count({
      where: { notAfter: { lte: now } },
    }),
    prisma.discoverySuggestion.count({ where: { status: "PENDING" } }),
    prisma.maintenanceConfig.count({ where: { enabled: true } }),
    prisma.windowsService.count({ where: { whitelisted: true } }),
    getBackupStats(),
    getRecentAuditLogs(8),
    getAuditStatsByModule(30),
    prisma.application.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const liveApps = appsByStatus.find((s) => s.status === "LIVE")?._count.id ?? 0;
  const inUsePorts = await prisma.port.count({ where: { status: "IN_USE" } });

  return {
    counts: {
      applications,
      liveApps,
      domains,
      ports,
      inUsePorts,
      users,
      nginxConfigs,
      pm2Processes,
      iisSites,
      sslTotal,
      sslExpiring,
      sslExpired,
      pendingSuggestions,
      maintenanceEnabled,
      whitelistedServices,
      backups: backupStats.total,
      backupsCompleted: backupStats.completed,
      backupsFailed: backupStats.failed,
    },
    appsByStatus: appsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    auditByModule,
    recentAudit,
    lastBackupAt: backupStats.latest?.createdAt ?? null,
  };
}
