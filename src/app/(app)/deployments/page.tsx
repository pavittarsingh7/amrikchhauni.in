import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { DeploymentsManager } from "@/components/deployments/deployments-manager";
import { getDeploymentOverview } from "@/lib/servers/service";

export default async function DeploymentsPage() {
  await getSession();
  const { deploymentTypes, applications } = await getDeploymentOverview();

  return (
    <div className="p-6">
      <PageHeader
        title="Deployments"
        description="Deployment types and application deployment overview"
      />
      <DeploymentsManager deploymentTypes={deploymentTypes} applications={applications} />
    </div>
  );
}
