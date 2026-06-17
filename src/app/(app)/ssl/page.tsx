import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { SslManager } from "@/components/ssl/ssl-manager";
import { listSslCertificates } from "@/lib/ssl/service";

export default async function SslPage() {
  const session = await getSession();
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const certificates = await listSslCertificates();

  return (
    <div className="p-6">
      <PageHeader
        title="SSL Certificates"
        description="Discover, renew, and request certificates via Win-ACME"
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Certificates ({certificates.length})
          </Card.Title>
          <Card.Description>
            {isSuperAdmin
              ? "Discovery syncs from Win-ACME and the Windows certificate store."
              : "View-only. Certificate management requires Super Admin."}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <SslManager certificates={certificates} isSuperAdmin={isSuperAdmin} />
        </Card.Content>
      </Card>
    </div>
  );
}
