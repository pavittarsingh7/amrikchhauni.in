"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Play, Square, RotateCcw, Trash2, FileText, Save } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/crud/entity-modal";
import { FormSelect } from "@/components/crud/form-fields";
import {
  pm2StartAction,
  pm2StopAction,
  pm2RestartAction,
  pm2DeleteAction,
  pm2SaveAction,
  linkPm2Action,
  getPm2LogsAction,
} from "@/actions/pm2";

type Pm2Row = {
  id: string;
  name: string;
  status: string | null;
  port: number | null;
  pid: number | null;
  uptime: string | null;
  restarts: number;
  applicationId: string | null;
  application: { id: string; name: string } | null;
};

interface Pm2ManagerProps {
  processes: Pm2Row[];
  applications: { id: string; name: string }[];
  readOnly?: boolean;
}

export function Pm2Manager({
  processes,
  applications,
  readOnly = false,
}: Pm2ManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsName, setLogsName] = useState<string | null>(null);

  function runAction(action: (name: string) => Promise<{ error?: string }>, name: string) {
    startTransition(async () => {
      await action(name);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteName) return;
    startTransition(async () => {
      await pm2DeleteAction(deleteName);
      setDeleteName(null);
      router.refresh();
    });
  }

  function handleLink(processId: string, applicationId: string) {
    startTransition(async () => {
      await linkPm2Action(processId, applicationId || null);
      router.refresh();
    });
  }

  function handleShowLogs(name: string) {
    startTransition(async () => {
      const result = await getPm2LogsAction(name);
      setLogsName(name);
      setLogs(result.output ?? result.error ?? "No logs");
    });
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            isDisabled={isPending}
            onPress={() =>
              startTransition(async () => {
                await pm2SaveAction();
              })
            }
          >
            <Save className="w-4 h-4" />
            Save PM2 List
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={processes}
        emptyMessage="No PM2 processes found"
        columns={[
          { key: "name", header: "Name" },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge status={String(row.status ?? "unknown")} />
            ),
          },
          { key: "port", header: "Port" },
          { key: "pid", header: "PID" },
          { key: "uptime", header: "Uptime" },
          { key: "restarts", header: "Restarts" },
          {
            key: "application",
            header: "Application",
            render: (row) =>
              readOnly ? (
                (row.application?.name ?? "—")
              ) : (
                <FormSelect
                  label=""
                  name={`link-${row.id}`}
                  value={row.applicationId ?? ""}
                  onChange={(v) => handleLink(row.id, v)}
                  options={applications}
                  placeholder="Unlinked"
                />
              ),
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "Actions",
                  render: (row: Pm2Row) => (
                    <div className="flex gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onPress={() => runAction(pm2StartAction, row.name)}
                        aria-label="Start"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onPress={() => runAction(pm2StopAction, row.name)}
                        aria-label="Stop"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onPress={() => runAction(pm2RestartAction, row.name)}
                        aria-label="Restart"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onPress={() => handleShowLogs(row.name)}
                        aria-label="Logs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        onPress={() => setDeleteName(row.name)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      {logs && (
        <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg">
          <div className="flex justify-between mb-2">
            <p className="text-sm text-slate-400">Logs: {logsName}</p>
            <Button size="sm" variant="ghost" onPress={() => setLogs(null)}>
              Close
            </Button>
          </div>
          <pre className="text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
            {logs}
          </pre>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteName}
        onClose={() => setDeleteName(null)}
        onConfirm={handleDelete}
        title="Delete PM2 Process"
        message={`Remove "${deleteName}" from PM2? This stops and removes the process.`}
        isLoading={isPending}
      />
    </>
  );
}
