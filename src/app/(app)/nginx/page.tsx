import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { NginxManager } from "@/components/nginx/nginx-manager";
import { DiscoveryRunButtonClient } from "@/components/discovery/discovery-run-button-client";
import { runNginxDiscoveryAction } from "@/actions/discovery";
import { listNginxConfigs } from "@/lib/nginx/service";

export default async function NginxPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const configs = await listNginxConfigs();

  return (
    <div className="p-6">
      <PageHeader
        title="Nginx"
        description="Manage site configurations with backup, test, and reload"
        actions={
          !readOnly ? (
            <DiscoveryRunButtonClient
              label="Scan Sites"
              action={runNginxDiscoveryAction}
            />
          ) : undefined
        }
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Site Configurations ({configs.length})
          </Card.Title>
          <Card.Description>
            Changes are backed up, tested with nginx -t, and rolled back on failure.
            {isSuperAdmin
              ? " Reload applies automatically after save."
              : " Super Admin required to reload nginx."}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <NginxManager
            configs={configs}
            isSuperAdmin={isSuperAdmin}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
