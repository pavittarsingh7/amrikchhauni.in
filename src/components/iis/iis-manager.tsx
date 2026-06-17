"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Play, Square, RotateCcw } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { FormSelect } from "@/components/crud/form-fields";
import {
  startIisSiteAction,
  stopIisSiteAction,
  restartIisSiteAction,
  startAppPoolAction,
  stopAppPoolAction,
  recycleAppPoolAction,
  linkIisAction,
} from "@/actions/iis";

type IisRow = {
  id: string;
  name: string;
  state: string | null;
  appPool: string | null;
  pattern: string | null;
  physicalPath: string | null;
  bindings: unknown;
  applicationId: string | null;
  application: { id: string; name: string } | null;
};

interface IisManagerProps {
  sites: IisRow[];
  applications: { id: string; name: string }[];
  readOnly?: boolean;
}

export function IisManager({
  sites,
  applications,
  readOnly = false,
}: IisManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function handleLink(siteId: string, applicationId: string) {
    run(() => linkIisAction(siteId, applicationId || null));
  }

  return (
    <DataTable
      keyField="id"
      data={sites}
      emptyMessage="No IIS sites found"
      columns={[
        { key: "name", header: "Site" },
        {
          key: "state",
          header: "State",
          render: (row) => (
            <StatusBadge status={String(row.state ?? "unknown")} />
          ),
        },
        { key: "appPool", header: "App Pool" },
        {
          key: "pattern",
          header: "Pattern",
          render: (row) => (
            <span className="text-xs font-mono text-blue-400">
              {String(row.pattern ?? "UNKNOWN")}
            </span>
          ),
        },
        {
          key: "physicalPath",
          header: "Path",
          className: "font-mono text-xs max-w-[180px] truncate",
        },
        {
          key: "bindings",
          header: "Bindings",
          render: (row) => {
            const bindings = row.bindings as Array<{
              protocol: string;
              bindingInformation: string;
            }> | null;
            if (!bindings?.length) return "—";
            return bindings
              .map((b) => `${b.protocol}://${b.bindingInformation}`)
              .join(", ");
          },
        },
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
                key: "siteActions",
                header: "Site",
                render: (row: IisRow) => (
                  <div className="flex gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onPress={() => run(() => startIisSiteAction(row.name))}
                      aria-label="Start site"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onPress={() => run(() => stopIisSiteAction(row.name))}
                      aria-label="Stop site"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onPress={() => run(() => restartIisSiteAction(row.name))}
                      aria-label="Restart site"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ),
              },
              {
                key: "poolActions",
                header: "App Pool",
                render: (row: IisRow) =>
                  row.appPool ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs min-w-0 px-1"
                        onPress={() =>
                          run(() => startAppPoolAction(row.appPool!))
                        }
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs min-w-0 px-1"
                        onPress={() =>
                          run(() => recycleAppPoolAction(row.appPool!))
                        }
                      >
                        Recycle
                      </Button>
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]
          : []),
      ]}
    />
  );
}
