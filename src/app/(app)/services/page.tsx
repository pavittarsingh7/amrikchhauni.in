import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { ServicesManager } from "@/components/services/services-manager";
import { listWindowsServices } from "@/lib/windows-services/service";

export default async function ServicesPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const services = await listWindowsServices();

  return (
    <div className="p-6">
      <PageHeader
        title="Windows Services"
        description="Start, stop, and restart whitelisted Windows services"
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Services ({services.length})
          </Card.Title>
          <Card.Description>
            Only whitelisted services can be controlled. Super Admin manages the
            whitelist.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ServicesManager
            services={services}
            isSuperAdmin={isSuperAdmin}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
