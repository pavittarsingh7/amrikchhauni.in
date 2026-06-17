import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { DiscoveryHubClient } from "@/components/discovery/discovery-hub-client";
import { SuggestionsTable } from "@/components/discovery/suggestions-table";
import { getDiscoveryStatsAction } from "@/actions/discovery";
import type { ApplicationDiscovery } from "@/lib/discovery/types";

export default async function DiscoveryPage() {
  const session = await getSession();
  const stats = await getDiscoveryStatsAction();

  const pendingSuggestions = await prisma.discoverySuggestion.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const readOnly = session?.role === "VIEWER";

  return (
    <div className="p-6">
      <PageHeader
        title="Discovery"
        description="Scan infrastructure and review application suggestions"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Nginx Configs" value={stats.nginxCount} />
        <StatCard label="PM2 Processes" value={stats.pm2Count} />
        <StatCard label="IIS Sites" value={stats.iisCount} />
        <StatCard
          label="Pending Suggestions"
          value={stats.pendingSuggestions}
          subtext={
            stats.lastDiscoveryAt
              ? `Last scan: ${stats.lastDiscoveryAt.toLocaleString()}`
              : "Never scanned"
          }
        />
      </div>

      <DiscoveryHubClient readOnly={readOnly} />

      <Card className="acdm-card mt-8">
        <Card.Header>
          <Card.Title className="acdm-card-title">
            Pending Application Suggestions
          </Card.Title>
          <Card.Description>
            Discovered projects require approval before being added to the registry
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <SuggestionsTable
            suggestions={pendingSuggestions.map((s) => ({
              id: s.id,
              name: s.name,
              source: s.source,
              data: s.data as unknown as ApplicationDiscovery,
              createdAt: s.createdAt,
            }))}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
