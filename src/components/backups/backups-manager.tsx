"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Database, Download, Trash2, RotateCcw } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/crud/entity-modal";
import {
  createBackupAction,
  restoreBackupAction,
  deleteBackupAction,
} from "@/actions/backups";

type BackupRow = {
  id: string;
  filename: string;
  status: string;
  sizeBytes: number | null;
  scheduled: boolean;
  completedAt: Date | null;
  createdAt: Date;
  error: string | null;
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const n = bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface BackupsManagerProps {
  backups: BackupRow[];
  isSuperAdmin: boolean;
}

export function BackupsManager({ backups, isSuperAdmin }: BackupsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleCreate() {
    startTransition(async () => {
      const result = await createBackupAction();
      setMessage(result.error ?? result.output ?? "Done");
      router.refresh();
    });
  }

  function handleRestore() {
    if (!restoreId) return;
    startTransition(async () => {
      const result = await restoreBackupAction(restoreId);
      setMessage(result.error ?? result.output ?? "Restored");
      setRestoreId(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      await deleteBackupAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      {isSuperAdmin && (
        <div className="flex justify-end mb-4">
          <Button
            variant="primary"
            onPress={handleCreate}
            isDisabled={isPending}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Create Backup
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-blue-400 mb-4 bg-blue-950/30 px-3 py-2 rounded-lg">
          {message}
        </p>
      )}

      <DataTable
        keyField="id"
        data={backups}
        emptyMessage="No backups yet"
        columns={[
          { key: "filename", header: "File", className: "font-mono text-xs" },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "sizeBytes",
            header: "Size",
            render: (row) => formatBytes(row.sizeBytes),
          },
          {
            key: "createdAt",
            header: "Created",
            render: (row) => new Date(row.createdAt).toLocaleString(),
          },
          {
            key: "scheduled",
            header: "Scheduled",
            render: (row) => (row.scheduled ? "Yes" : "No"),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row: BackupRow) =>
              row.status === "COMPLETED" ? (
                <div className="flex gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Download"
                    onPress={() =>
                      window.open(`/api/backups/${row.id}/download`, "_blank")
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  {isSuperAdmin && (
                    <>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Restore"
                        onPress={() => setRestoreId(row.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        aria-label="Delete"
                        onPress={() => setDeleteId(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                "—"
              ),
          },
        ]}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        title="Restore Database"
        message="This will overwrite the current database with the backup contents. This action cannot be undone."
        confirmLabel="Restore"
        isLoading={isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Backup"
        message="Remove this backup file from disk?"
        isLoading={isPending}
      />
    </>
  );
}
