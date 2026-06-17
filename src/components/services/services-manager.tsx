"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Play, Square, RotateCcw, Shield } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { ActionButton } from "@/components/infra/action-button";
import {
  syncWindowsServicesAction,
  startServiceAction,
  stopServiceAction,
  restartServiceAction,
  toggleServiceWhitelistAction,
} from "@/actions/services";

type ServiceRow = {
  id: string;
  name: string;
  displayName: string | null;
  status: string | null;
  startType: string | null;
  whitelisted: boolean;
};

interface ServicesManagerProps {
  services: ServiceRow[];
  isSuperAdmin: boolean;
  readOnly?: boolean;
}

export function ServicesManager({
  services,
  isSuperAdmin,
  readOnly = false,
}: ServicesManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function toggleWhitelist(name: string, current: boolean) {
    run(() => toggleServiceWhitelistAction(name, !current));
  }

  const whitelisted = services.filter((s) => s.whitelisted);

  return (
    <>
      {!readOnly && (
        <div className="flex justify-between mb-4">
          <p className="text-sm text-slate-500">
            {whitelisted.length} whitelisted of {services.length} services
          </p>
          <ActionButton
            label="Sync Services"
            onAction={syncWindowsServicesAction}
          />
        </div>
      )}

      <DataTable
        keyField="id"
        data={services}
        emptyMessage="No services found. Run sync to discover."
        columns={[
          { key: "name", header: "Service", className: "font-mono text-xs" },
          { key: "displayName", header: "Display Name" },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge status={String(row.status ?? "unknown")} />
            ),
          },
          { key: "startType", header: "Start Type" },
          {
            key: "whitelisted",
            header: "Whitelist",
            render: (row) =>
              isSuperAdmin && !readOnly ? (
                <Button
                  size="sm"
                  variant={row.whitelisted ? "primary" : "ghost"}
                  onPress={() => toggleWhitelist(row.name, row.whitelisted)}
                  className="gap-1 min-w-0"
                >
                  <Shield className="w-3 h-3" />
                  {row.whitelisted ? "Yes" : "No"}
                </Button>
              ) : row.whitelisted ? (
                "Yes"
              ) : (
                "No"
              ),
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "Actions",
                  render: (row: ServiceRow) =>
                    row.whitelisted ? (
                      <div className="flex gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => run(() => startServiceAction(row.name))}
                          aria-label="Start"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => run(() => stopServiceAction(row.name))}
                          aria-label="Stop"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() =>
                            run(() => restartServiceAction(row.name))
                          }
                          aria-label="Restart"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">Not whitelisted</span>
                    ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
