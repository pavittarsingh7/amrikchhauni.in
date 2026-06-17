"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormCheckbox } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createServerAction,
  updateServerAction,
  deleteServerAction,
} from "@/actions/servers";
import type { ServerInput } from "@/lib/validations/crud";

type ServerRow = {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string | null;
  operatingSystem: string | null;
  environment: string;
  active: boolean;
  isCurrent: boolean;
};

const emptyForm: ServerInput = {
  name: "",
  hostname: "",
  ipAddress: "",
  operatingSystem: "",
  environment: "production",
  active: true,
  isCurrent: false,
};

interface ServersManagerProps {
  servers: ServerRow[];
  readOnly?: boolean;
}

export function ServersManager({ servers, readOnly = false }: ServersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServerInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: ServerRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      hostname: row.hostname,
      ipAddress: row.ipAddress ?? "",
      operatingSystem: row.operatingSystem ?? "",
      environment: row.environment,
      active: row.active,
      isCurrent: row.isCurrent,
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateServerAction(editingId, form)
        : await createServerAction(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      await deleteServerAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Server
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={servers}
        emptyMessage="No servers registered"
        columns={[
          { key: "name", header: "Name" },
          { key: "hostname", header: "Hostname", className: "font-mono text-xs" },
          { key: "ipAddress", header: "IP", render: (r) => r.ipAddress ?? "—" },
          { key: "environment", header: "Env" },
          {
            key: "isCurrent",
            header: "Current",
            render: (r) =>
              r.isCurrent ? <StatusBadge status="current" variant="success" /> : "—",
          },
          {
            key: "active",
            header: "Status",
            render: (r) => (
              <StatusBadge status={r.active ? "active" : "inactive"} variant={r.active ? "success" : "default"} />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row: ServerRow) => (
              <RowActions
                onEdit={() => openEdit(row)}
                onDelete={() => setDeleteId(row.id)}
                readOnly={readOnly || row.isCurrent}
              />
            ),
          },
        ]}
      />

      <EntityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Server" : "Add Server"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save" : "Create"}
        isLoading={isPending}
      >
        <div className="space-y-4">
          <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired>
            <Label>Name</Label>
            <Input />
          </TextField>
          <TextField value={form.hostname} onChange={(v) => setForm({ ...form, hostname: v })} isRequired>
            <Label>Hostname</Label>
            <Input className="font-mono" />
          </TextField>
          <TextField value={form.ipAddress ?? ""} onChange={(v) => setForm({ ...form, ipAddress: v })}>
            <Label>IP Address</Label>
            <Input />
          </TextField>
          <TextField value={form.operatingSystem ?? ""} onChange={(v) => setForm({ ...form, operatingSystem: v })}>
            <Label>Operating System</Label>
            <Input />
          </TextField>
          <TextField value={form.environment ?? "production"} onChange={(v) => setForm({ ...form, environment: v })}>
            <Label>Environment</Label>
            <Input />
          </TextField>
          <FormCheckbox label="Active" name="active" checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
          <FormCheckbox label="Current Server" name="isCurrent" checked={form.isCurrent ?? false} onChange={(v) => setForm({ ...form, isCurrent: v })} />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </EntityModal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Server" message="Remove this server from the registry?" isLoading={isPending} />
    </>
  );
}
