"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Download, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EntityModal } from "@/components/crud/entity-modal";
import { FormSelect } from "@/components/crud/form-fields";
import {
  getAuditLogDetailAction,
  exportAuditLogsAction,
} from "@/actions/audit";

type AuditRow = {
  id: string;
  username: string | null;
  action: string;
  module: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

interface AuditLogsManagerProps {
  logs: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  modules: string[];
  actions: string[];
  currentModule?: string;
  currentAction?: string;
  currentSearch?: string;
}

export function AuditLogsManager({
  logs,
  total,
  page,
  pageSize,
  totalPages,
  modules,
  actions: actionOptions,
  currentModule = "",
  currentAction = "",
  currentSearch = "",
}: AuditLogsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [moduleFilter, setModuleFilter] = useState(currentModule);
  const [actionFilter, setActionFilter] = useState(currentAction);
  const [search, setSearch] = useState(currentSearch);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<{
    before: unknown;
    after: unknown;
    username: string | null;
    action: string;
    module: string;
    createdAt: Date;
  } | null>(null);

  function applyFilters(nextPage = 1) {
    const params = new URLSearchParams();
    if (moduleFilter) params.set("module", moduleFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (search) params.set("search", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/audit-logs?${params.toString()}`);
  }

  function viewDetail(id: string) {
    startTransition(async () => {
      const log = await getAuditLogDetailAction(id);
      if (!log) return;
      setDetail({
        before: log.before,
        after: log.after,
        username: log.username,
        action: log.action,
        module: log.module,
        createdAt: log.createdAt,
      });
      setDetailOpen(true);
    });
  }

  function handleExport() {
    startTransition(async () => {
      const csv = await exportAuditLogsAction({
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acdm-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="w-40">
          <FormSelect
            label="Module"
            name="module"
            value={moduleFilter}
            onChange={setModuleFilter}
            options={modules.map((m) => ({ id: m, name: m }))}
            placeholder="All modules"
          />
        </div>
        <div className="w-40">
          <FormSelect
            label="Action"
            name="action"
            value={actionFilter}
            onChange={setActionFilter}
            options={actionOptions.map((a) => ({ id: a, name: a }))}
            placeholder="All actions"
          />
        </div>
        <TextField value={search} onChange={setSearch} className="w-48">
          <Label>Search</Label>
          <Input placeholder="User, module, entity..." />
        </TextField>
        <Button variant="primary" size="sm" onPress={() => applyFilters(1)}>
          Filter
        </Button>
        <Button variant="secondary" size="sm" onPress={handleExport} className="gap-1">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        {total} log{total !== 1 ? "s" : ""} — page {page} of {totalPages || 1}
      </p>

      <DataTable
        keyField="id"
        data={logs}
        emptyMessage="No audit logs found"
        columns={[
          {
            key: "createdAt",
            header: "Time",
            render: (row) => new Date(row.createdAt).toLocaleString(),
            className: "text-xs whitespace-nowrap",
          },
          { key: "username", header: "User", render: (row) => row.username ?? "system" },
          { key: "action", header: "Action" },
          { key: "module", header: "Module" },
          {
            key: "entityId",
            header: "Entity",
            className: "font-mono text-xs max-w-[120px] truncate",
            render: (row) => row.entityId ?? "—",
          },
          {
            key: "actions",
            header: "",
            render: (row: AuditRow) => (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="View details"
                onPress={() => viewDetail(row.id)}
                isDisabled={isPending}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
            ),
          },
        ]}
      />

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page <= 1}
            onPress={() => applyFilters(page - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page >= totalPages}
            onPress={() => applyFilters(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <EntityModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Audit Log Detail"
        onSubmit={() => setDetailOpen(false)}
        submitLabel="Close"
        size="xl"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <span>User: {detail.username ?? "system"}</span>
              <span>Time: {new Date(detail.createdAt).toLocaleString()}</span>
              <span>Action: {detail.action}</span>
              <span>Module: {detail.module}</span>
            </div>
            {detail.before != null && (
              <div>
                <p className="text-slate-500 text-xs uppercase mb-1">Before</p>
                <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg overflow-auto max-h-48 text-xs text-slate-700 dark:text-slate-300">
                  {JSON.stringify(detail.before, null, 2)}
                </pre>
              </div>
            )}
            {detail.after != null && (
              <div>
                <p className="text-slate-500 text-xs uppercase mb-1">After</p>
                <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg overflow-auto max-h-48 text-xs text-slate-700 dark:text-slate-300">
                  {JSON.stringify(detail.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </EntityModal>
    </>
  );
}
