import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { MaintenanceManager } from "@/components/maintenance/maintenance-manager";
import { getMaintenanceStatus } from "@/lib/maintenance/service";

export default async function MaintenancePage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const { page, configs, serverWideEnabled, domains } =
    await getMaintenanceStatus();

  return (
    <div className="p-6">
      <PageHeader
        title="Maintenance"
        description="Per-site or server-wide maintenance via nginx map"
      />

      <MaintenanceManager
        page={page}
        configs={configs}
        domains={domains}
        serverWideEnabled={serverWideEnabled}
        isSuperAdmin={isSuperAdmin}
        readOnly={readOnly}
      />
    </div>
  );
}
