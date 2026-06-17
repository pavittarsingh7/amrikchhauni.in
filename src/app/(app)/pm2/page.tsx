import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { Pm2Manager } from "@/components/pm2/pm2-manager";
import { DiscoveryRunButtonClient } from "@/components/discovery/discovery-run-button-client";
import { runPm2DiscoveryAction } from "@/actions/discovery";
import { listPm2Processes } from "@/lib/pm2/service";
import { prisma } from "@/lib/db/prisma";

export default async function Pm2Page() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";

  const [processes, applications] = await Promise.all([
    listPm2Processes(),
    prisma.application.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="PM2"
        description="Control PM2 processes — start, stop, restart, and link to applications"
        actions={
          !readOnly ? (
            <DiscoveryRunButtonClient
              label="Scan PM2"
              action={runPm2DiscoveryAction}
            />
          ) : undefined
        }
      />

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Processes ({processes.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Pm2Manager
            processes={processes}
            applications={applications}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
