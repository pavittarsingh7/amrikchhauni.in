import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { StatusBadge } from "@/components/ui/data-table";
import { getDashboardStats } from "@/lib/dashboard/stats";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const { counts } = stats;

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard"
        description="Infrastructure overview and recent activity"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Applications"
          value={counts.applications}
          subtext={`${counts.liveApps} live`}
        />
        <StatCard
          label="Domains"
          value={counts.domains}
          subtext={`${counts.nginxConfigs} nginx configs`}
        />
        <StatCard
          label="Ports"
          value={counts.ports}
          subtext={`${counts.inUsePorts} in use`}
        />
        <StatCard label="Active Users" value={counts.users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="PM2 Processes"
          value={counts.pm2Processes}
          subtext={`${counts.iisSites} IIS sites`}
        />
        <StatCard
          label="SSL Certificates"
          value={counts.sslTotal}
          subtext={
            counts.sslExpired > 0
              ? `${counts.sslExpired} expired`
              : counts.sslExpiring > 0
                ? `${counts.sslExpiring} expiring soon`
                : "All valid"
          }
        />
        <StatCard
          label="Backups"
          value={counts.backupsCompleted}
          subtext={
            stats.lastBackupAt
              ? `Last: ${new Date(stats.lastBackupAt).toLocaleDateString()}`
              : "No backups yet"
          }
        />
        <StatCard
          label="Discovery"
          value={counts.pendingSuggestions}
          subtext="pending suggestions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="acdm-card lg:col-span-2">
          <Card.Header>
            <Card.Title className="acdm-card-title">Recent Activity</Card.Title>
            <Card.Description>
              <Link href="/audit-logs" className="text-blue-400 hover:underline">
                View all audit logs →
              </Link>
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {stats.recentAudit.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentAudit.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800/30 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={log.action} />
                      <span className="text-slate-600 dark:text-slate-400">{log.module}</span>
                      <span className="text-slate-500 dark:text-slate-500 truncate">
                        {log.username ?? "system"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-600 whitespace-nowrap ml-2">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        <div className="space-y-6">
          <Card className="acdm-card">
            <Card.Header>
              <Card.Title className="acdm-card-title">Applications by Status</Card.Title>
            </Card.Header>
            <Card.Content className="gap-2 flex flex-col">
              {stats.appsByStatus.map((s) => (
                <div key={s.status} className="flex justify-between text-sm">
                  <StatusBadge status={s.status} />
                  <span className="text-slate-900 dark:text-white font-medium">{s.count}</span>
                </div>
              ))}
              {stats.appsByStatus.length === 0 && (
                <p className="text-sm text-slate-500">No applications</p>
              )}
            </Card.Content>
          </Card>

          <Card className="acdm-card">
            <Card.Header>
              <Card.Title className="acdm-card-title">Audit (30 days)</Card.Title>
            </Card.Header>
            <Card.Content className="gap-2 flex flex-col">
              {stats.auditByModule.slice(0, 8).map((m) => (
                <div key={m.module} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{m.module}</span>
                  <span className="text-slate-900 dark:text-white">{m.count}</span>
                </div>
              ))}
              {stats.auditByModule.length === 0 && (
                <p className="text-sm text-slate-500">No audit events</p>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      <Card className="acdm-card mt-6">
        <Card.Header>
          <Card.Title className="acdm-card-title">Quick Links</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-3 text-sm">
            {counts.pendingSuggestions > 0 && (
              <Link href="/discovery" className="text-yellow-400 hover:underline">
                {counts.pendingSuggestions} pending discovery suggestions
              </Link>
            )}
            {counts.sslExpired > 0 && (
              <Link href="/ssl" className="text-red-400 hover:underline">
                {counts.sslExpired} expired SSL certificate(s)
              </Link>
            )}
            {counts.sslExpiring > 0 && (
              <Link href="/ssl" className="text-yellow-400 hover:underline">
                {counts.sslExpiring} SSL cert(s) expiring within 30 days
              </Link>
            )}
            {counts.maintenanceEnabled > 0 && (
              <Link href="/maintenance" className="text-orange-400 hover:underline">
                {counts.maintenanceEnabled} site(s) in maintenance
              </Link>
            )}
            {counts.backupsFailed > 0 && (
              <Link href="/backups" className="text-red-400 hover:underline">
                {counts.backupsFailed} failed backup(s)
              </Link>
            )}
            {counts.pendingSuggestions === 0 &&
              counts.sslExpired === 0 &&
              counts.sslExpiring === 0 &&
              counts.maintenanceEnabled === 0 &&
              counts.backupsFailed === 0 && (
                <span className="text-green-400">All systems nominal</span>
              )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
