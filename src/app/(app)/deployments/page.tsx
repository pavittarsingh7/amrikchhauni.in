import { getSession } from "@/lib/auth/session";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { DeploymentsManager } from "@/components/deployments/deployments-manager";
import {
  getDeploymentDashboard,
  getDeploymentFilterOptions,
  listDeployments,
} from "@/lib/deployments/service";

interface DeploymentsPageProps {
  searchParams: Promise<{
    applicationId?: string;
    serverId?: string;
    userId?: string;
    status?: string;
    branch?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function DeploymentsPage({ searchParams }: DeploymentsPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const [dashboard, history, filterOptions] = await Promise.all([
    getDeploymentDashboard(),
    listDeployments({
      applicationId: params.applicationId,
      serverId: params.serverId,
      userId: params.userId,
      status: params.status,
      branch: params.branch,
      from: params.from,
      to: params.to,
      page,
    }),
    getDeploymentFilterOptions(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Deployments"
        description="Deployment control center for applications already registered in ACDM"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Applications" value={dashboard.stats.totalApplications} />
        <StatCard
          label="Updates Available"
          value={dashboard.stats.updatesAvailable}
          subtext="cached git status"
        />
        <StatCard label="Deployments Today" value={dashboard.stats.deploymentsToday} />
        <StatCard
          label="Successful"
          value={dashboard.stats.successfulToday}
          subtext="today"
        />
        <StatCard
          label="Failed"
          value={dashboard.stats.failedToday}
          subtext="today"
        />
      </div>

      <DeploymentsManager
        deploymentTypes={dashboard.deploymentTypes}
        applications={dashboard.applications}
        recent={dashboard.recent}
        history={history.items}
        historyTotal={history.total}
        historyPage={history.page}
        historyTotalPages={history.totalPages}
        filterOptions={filterOptions}
        currentFilters={{
          applicationId: params.applicationId ?? "",
          serverId: params.serverId ?? "",
          userId: params.userId ?? "",
          status: params.status ?? "",
          branch: params.branch ?? "",
          from: params.from ?? "",
          to: params.to ?? "",
        }}
        serverName={dashboard.server?.name ?? null}
        environment={dashboard.server?.environment ?? null}
        readOnly={session?.role === "VIEWER"}
      />
    </div>
  );
}
