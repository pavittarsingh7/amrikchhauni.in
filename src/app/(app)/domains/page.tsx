import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { DomainsManager } from "@/components/domains/domains-manager";
import { DiscoveryRunButtonClient } from "@/components/discovery/discovery-run-button-client";
import { runNginxDiscoveryAction } from "@/actions/discovery";
import { listDomains, getDomainFormOptions } from "@/lib/domains/service";

export default async function DomainsPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";

  const [domains, applications] = await Promise.all([
    listDomains(),
    getDomainFormOptions(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Domains"
        description="Manage domain configurations and SSL bindings"
        actions={
          !readOnly ? (
            <DiscoveryRunButtonClient
              label="Refresh from Nginx"
              action={runNginxDiscoveryAction}
            />
          ) : undefined
        }
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Domains ({domains.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <DomainsManager
            domains={domains}
            applications={applications}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
