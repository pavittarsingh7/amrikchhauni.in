import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { AuditLogsManager } from "@/components/audit/audit-logs-manager";
import { listAuditLogs, getAuditFilterOptions } from "@/lib/audit/service";

interface AuditLogsPageProps {
  searchParams: Promise<{
    module?: string;
    action?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  await getSession();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const [result, filterOptions] = await Promise.all([
    listAuditLogs({
      module: params.module,
      action: params.action,
      search: params.search,
      page,
    }),
    getAuditFilterOptions(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Logs"
        description="Platform activity and configuration changes"
      />

      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">Activity Log</Card.Title>
          <Card.Description>
            Every mutation is recorded with user, timestamp, and before/after state.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
            <AuditLogsManager
              logs={result.items}
              total={result.total}
              page={result.page}
              pageSize={result.pageSize}
              totalPages={result.totalPages}
              modules={filterOptions.modules}
              actions={filterOptions.actions}
              currentModule={params.module ?? ""}
              currentAction={params.action ?? ""}
              currentSearch={params.search ?? ""}
            />
          </Suspense>
        </Card.Content>
      </Card>
    </div>
  );
}
