import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { MaintenanceManager } from "@/components/maintenance/maintenance-manager";
import { getMaintenanceStatus } from "@/lib/maintenance/service";

export default async function MaintenancePage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const { page, serverWideEnabled, domains } = await getMaintenanceStatus();

  return (
    <div className="p-6">
      <PageHeader
        title="Maintenance"
        description="Per-site or server-wide maintenance by swapping nginx location blocks (no shared snippet edits)"
      />

      <MaintenanceManager
        page={page}
        domains={domains}
        serverWideEnabled={serverWideEnabled}
        isSuperAdmin={isSuperAdmin}
        readOnly={readOnly}
      />
    </div>
  );
}
