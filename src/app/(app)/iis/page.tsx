import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { IisManager } from "@/components/iis/iis-manager";
import { DiscoveryRunButtonClient } from "@/components/discovery/discovery-run-button-client";
import { runIisDiscoveryAction } from "@/actions/discovery";
import { listIisSites } from "@/lib/iis/service";
import { prisma } from "@/lib/db/prisma";

export default async function IisPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";

  const [sites, applications] = await Promise.all([
    listIisSites(),
    prisma.application.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="IIS"
        description="Manage IIS sites, app pools, and application bindings"
        actions={
          !readOnly ? (
            <DiscoveryRunButtonClient
              label="Scan IIS"
              action={runIisDiscoveryAction}
            />
          ) : undefined
        }
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            IIS Sites ({sites.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <IisManager
            sites={sites}
            applications={applications}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
