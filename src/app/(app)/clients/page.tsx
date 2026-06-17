import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { ClientsManager } from "@/components/clients/clients-manager";
import { listClients } from "@/lib/clients/service";

export default async function ClientsPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const clients = await listClients();

  return (
    <div className="p-6">
      <PageHeader title="Clients" description="Manage client records linked to applications" />
      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Clients ({clients.length})</Card.Title>
        </Card.Header>
        <Card.Content>
          <ClientsManager clients={clients} readOnly={readOnly} />
        </Card.Content>
      </Card>
    </div>
  );
}
