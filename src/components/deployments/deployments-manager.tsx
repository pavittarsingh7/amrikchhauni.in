import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { Card } from "@heroui/react";

type DeploymentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { applications: number };
};

type ApplicationRow = {
  id: string;
  name: string;
  status: string;
  deploymentType: { name: string } | null;
  technology: { name: string } | null;
  client: { name: string } | null;
  _count: { domains: number; ports: number };
};

interface DeploymentsManagerProps {
  deploymentTypes: DeploymentTypeRow[];
  applications: ApplicationRow[];
}

export function DeploymentsManager({
  deploymentTypes,
  applications,
}: DeploymentsManagerProps) {
  return (
    <div className="space-y-8">
      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Deployment Types</Card.Title>
          <Card.Description>
            Master deployment methods — linked from application records
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <DataTable
            keyField="id"
            data={deploymentTypes}
            emptyMessage="No deployment types"
            columns={[
              { key: "name", header: "Type" },
              { key: "description", header: "Description", render: (r) => r.description ?? "—" },
              { key: "count", header: "Applications", render: (r) => r._count.applications },
            ]}
          />
        </Card.Content>
      </Card>

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Application Deployments</Card.Title>
          <Card.Description>
            Current deployment configuration per application (read-only overview)
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <DataTable
            keyField="id"
            data={applications}
            emptyMessage="No applications"
            columns={[
              { key: "name", header: "Application" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "deploymentType", header: "Type", render: (r) => r.deploymentType?.name ?? "—" },
              { key: "technology", header: "Technology", render: (r) => r.technology?.name ?? "—" },
              { key: "client", header: "Client", render: (r) => r.client?.name ?? "—" },
              {
                key: "infra",
                header: "Domains / Ports",
                render: (r) => `${r._count.domains} / ${r._count.ports}`,
              },
            ]}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
