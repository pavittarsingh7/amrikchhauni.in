"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus, RotateCcw } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { RowActions } from "@/components/crud/row-actions";
import { ActionButton } from "@/components/infra/action-button";
import {
  createNginxConfigAction,
  updateNginxConfigAction,
  deleteNginxConfigAction,
  restoreNginxBackupAction,
  testNginxConfigAction,
  reloadNginxAction,
  restartNginxAction,
  generateNginxTemplateAction,
  getNginxConfigAction,
} from "@/actions/nginx";

type NginxRow = {
  id: string;
  filename: string;
  filepath: string;
  content: string | null;
  domain: string | null;
  enabled: boolean;
  testPassed: boolean | null;
  lastTested: Date | null;
  updatedAt: Date;
  _count?: { backups: number };
};

type Backup = {
  id: string;
  content: string;
  filepath: string;
  reason: string | null;
  createdAt: Date;
};

interface NginxManagerProps {
  configs: NginxRow[];
  isSuperAdmin: boolean;
  readOnly?: boolean;
}

export function NginxManager({
  configs,
  isSuperAdmin,
  readOnly = false,
}: NginxManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<NginxRow | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [content, setContent] = useState("");
  const [domain, setDomain] = useState("");
  const [filename, setFilename] = useState("");
  const [templatePort, setTemplatePort] = useState("5006");
  const [error, setError] = useState<string | null>(null);
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  async function openEdit(row: NginxRow) {
    setEditing(row);
    setContent(row.content ?? "");
    setDomain(row.domain ?? "");
    setError(null);
    const detail = await getNginxConfigAction(row.id);
    setBackups(detail?.backups ?? []);
    setEditOpen(true);
  }

  function openCreate() {
    setFilename("");
    setDomain("");
    setContent("");
    setTemplatePort("5006");
    setError(null);
    setCreateOpen(true);
  }

  async function handleGenerateTemplate() {
    if (!domain) return;
    const result = await generateNginxTemplateAction(
      domain,
      parseInt(templatePort, 10) || 5006
    );
    setContent(result.template);
    if (!filename) setFilename(`${domain}.conf`);
  }

  function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await updateNginxConfigAction(editing.id, {
        content,
        domain: domain || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setGlobalMsg(result.output ?? "Saved");
      setEditOpen(false);
      router.refresh();
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createNginxConfigAction({
        filename,
        content,
        domain: domain || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setGlobalMsg(result.output ?? "Created");
      setCreateOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteNginxConfigAction(deleteId);
      if (result.error) setGlobalMsg(result.error);
      setDeleteId(null);
      router.refresh();
    });
  }

  function handleRestore(backupId: string) {
    startTransition(async () => {
      const result = await restoreNginxBackupAction(backupId);
      if (result.error) setError(result.error);
      else {
        setEditOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <>
              <ActionButton
                label="Test Config"
                onAction={testNginxConfigAction}
              />
              {isSuperAdmin && (
                <>
                  <ActionButton
                    label="Reload"
                    onAction={reloadNginxAction}
                    variant="primary"
                  />
                  <ActionButton
                    label="Restart Service"
                    onAction={restartNginxAction}
                    variant="danger"
                  />
                </>
              )}
            </>
          )}
        </div>
        {!readOnly && (
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            New Site Config
          </Button>
        )}
      </div>

      {globalMsg && (
        <p className="text-sm text-blue-400 mb-4 bg-blue-950/30 px-3 py-2 rounded-lg">
          {globalMsg}
        </p>
      )}

      <DataTable
        keyField="id"
        data={configs}
        emptyMessage="No nginx configs found"
        columns={[
          { key: "filename", header: "File", className: "font-mono text-xs" },
          { key: "domain", header: "Domain" },
          {
            key: "testPassed",
            header: "Test",
            render: (row) =>
              row.testPassed === null ? (
                "—"
              ) : (
                <StatusBadge
                  status={row.testPassed ? "passed" : "failed"}
                  variant={row.testPassed ? "success" : "error"}
                />
              ),
          },
          {
            key: "backups",
            header: "Backups",
            render: (row) => row._count?.backups ?? 0,
          },
          {
            key: "updatedAt",
            header: "Updated",
            render: (row) =>
              new Date(row.updatedAt).toLocaleDateString(),
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "",
                  render: (row: NginxRow) => (
                    <RowActions
                      onEdit={() => openEdit(row)}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />

      <EntityModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit — ${editing?.filename}`}
        onSubmit={handleSaveEdit}
        submitLabel="Save & Test"
        isLoading={isPending}
        size="xl"
      >
        <div className="space-y-4">
          <TextField value={domain} onChange={setDomain}>
            <Label>Domain</Label>
            <Input />
          </TextField>
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">
              Configuration
            </Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-green-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              spellCheck={false}
            />
          </div>
          {backups.length > 0 && (
            <div>
              <p className="text-xs uppercase text-slate-500 mb-2">Backups</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs bg-slate-800/50 px-2 py-1 rounded"
                  >
                    <span className="text-slate-400">
                      {new Date(b.createdAt).toLocaleString()} — {b.reason}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => handleRestore(b.id)}
                      className="min-w-0 px-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 px-3 py-2 rounded-lg whitespace-pre-wrap">
              {error}
            </p>
          )}
        </div>
      </EntityModal>

      <EntityModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Site Config"
        onSubmit={handleCreate}
        submitLabel="Create & Test"
        isLoading={isPending}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField value={filename} onChange={setFilename} isRequired>
              <Label>Filename</Label>
              <Input placeholder="app.example.com.conf" className="font-mono" />
            </TextField>
            <TextField value={domain} onChange={setDomain}>
              <Label>Domain</Label>
              <Input placeholder="app.example.com" />
            </TextField>
          </div>
          <div className="flex gap-2 items-end">
            <TextField
              value={templatePort}
              onChange={setTemplatePort}
              className="flex-1"
            >
              <Label>Port (for template)</Label>
              <Input type="number" />
            </TextField>
            <Button variant="secondary" onPress={handleGenerateTemplate}>
              Generate Template
            </Button>
          </div>
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">
              Configuration
            </Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-green-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              spellCheck={false}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 px-3 py-2 rounded-lg whitespace-pre-wrap">
              {error}
            </p>
          )}
        </div>
      </EntityModal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Nginx Config"
        message="This removes the config file from disk after backup. Nginx will be tested."
        isLoading={isPending}
      />
    </>
  );
}
