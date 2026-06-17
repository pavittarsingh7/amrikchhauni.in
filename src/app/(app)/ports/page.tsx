import { getSession } from "@/lib/auth/session";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { PortsManager } from "@/components/ports/ports-manager";
import { listPorts, getPortFormOptions, getPortStats } from "@/lib/ports/service";

export default async function PortsPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";

  const [ports, applications, stats] = await Promise.all([
    listPorts(),
    getPortFormOptions(),
    getPortStats(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Ports"
        description="Centralized port inventory with auto-assignment"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Ports" value={stats.total} />
        <StatCard label="In Use" value={stats.inUse} />
        <StatCard label="Available" value={stats.available} />
        <StatCard label="Reserved" value={stats.reserved} />
      </div>

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Port Registry ({ports.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <PortsManager
            ports={ports}
            applications={applications}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
