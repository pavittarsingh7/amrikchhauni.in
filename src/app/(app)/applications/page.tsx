import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { SuggestionsTable } from "@/components/discovery/suggestions-table";
import { ApplicationsManager } from "@/components/applications/applications-manager";
import { DiscoveryRunButtonClient } from "@/components/discovery/discovery-run-button-client";
import { runApplicationDiscoveryAction } from "@/actions/discovery";
import { getApplicationFormOptions } from "@/lib/applications/service";
import type { ApplicationDiscovery } from "@/lib/discovery/types";

export default async function ApplicationsPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";

  const [applications, pendingSuggestions, counts, formOptions] =
    await Promise.all([
      prisma.application.findMany({
        include: {
          technology: true,
          deploymentType: true,
          ideaSource: true,
          client: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.discoverySuggestion.findMany({
        where: { status: "PENDING", type: "application" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.application.groupBy({ by: ["status"], _count: true }),
      getApplicationFormOptions(),
    ]);

  const liveCount = counts.find((c) => c.status === "LIVE")?._count ?? 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Applications"
        description="Manage application metadata, deployment config, and discovery"
        actions={
          !readOnly ? (
            <DiscoveryRunButtonClient
              label="Scan Projects"
              action={runApplicationDiscoveryAction}
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={applications.length} />
        <StatCard label="Live" value={liveCount} />
        <StatCard
          label="Pending Suggestions"
          value={pendingSuggestions.length}
        />
      </div>

      {pendingSuggestions.length > 0 && (
        <Card className="bg-slate-900 border border-slate-800 mb-8">
          <Card.Header>
            <Card.Title className="text-white">
              Pending Discovery Suggestions
            </Card.Title>
            <Card.Description>
              Approve to add these projects to the application registry
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
      )}

      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">
            Registered Applications ({applications.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <ApplicationsManager
            applications={applications}
            formOptions={formOptions}
            readOnly={readOnly}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
