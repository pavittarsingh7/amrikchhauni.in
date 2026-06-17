import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { BackupsManager } from "@/components/backups/backups-manager";
import { listBackups, getBackupStats } from "@/lib/backups/service";

export default async function BackupsPage() {
  const session = await getSession();
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const [backups, stats] = await Promise.all([listBackups(), getBackupStats()]);

  const rows = backups.map((b) => ({
    ...b,
    sizeBytes: b.sizeBytes != null ? Number(b.sizeBytes) : null,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Backups"
        description="PostgreSQL database backup and restore"
      />

      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">
            Database Backups ({stats.total})
          </Card.Title>
          <Card.Description>
            Stored in D:\server-config\backups\database.{" "}
            {isSuperAdmin
              ? "Create, restore, and delete require Super Admin."
              : "Download available for Administrators."}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <BackupsManager backups={rows} isSuperAdmin={isSuperAdmin} />
        </Card.Content>
      </Card>
    </div>
  );
}
