import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { ServersManager } from "@/components/servers/servers-manager";
import { listServers } from "@/lib/servers/service";

export default async function ServersPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const servers = await listServers();

  return (
    <div className="p-6">
      <PageHeader
        title="Servers"
        description="Server registry for multi-server support"
      />
      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Registered Servers ({servers.length})</Card.Title>
          <Card.Description>
            Mark one server as current. Remote execution is planned for future releases.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ServersManager servers={servers} readOnly={readOnly} />
        </Card.Content>
      </Card>
    </div>
  );
}
