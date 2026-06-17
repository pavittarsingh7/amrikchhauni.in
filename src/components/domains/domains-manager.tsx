"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormSelect, FormCheckbox } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createDomainAction,
  updateDomainAction,
  deleteDomainAction,
} from "@/actions/domains";
import type { DomainInput } from "@/lib/validations/crud";

type DomainRow = {
  id: string;
  hostname: string;
  subdomain: string | null;
  sslEnabled: boolean;
  proxyPass: string | null;
  rootPath: string | null;
  targetPort: number | null;
  nginxConfigPath: string | null;
  applicationId: string | null;
  discovered: boolean;
  application: { id: string; name: string } | null;
};

const emptyForm: DomainInput = {
  hostname: "",
  subdomain: "",
  sslEnabled: false,
  proxyPass: "",
  rootPath: "",
  targetPort: undefined,
  nginxConfigPath: "",
  applicationId: "",
};

interface DomainsManagerProps {
  domains: DomainRow[];
  applications: { id: string; name: string }[];
  readOnly?: boolean;
}

export function DomainsManager({
  domains,
  applications,
  readOnly = false,
}: DomainsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DomainInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: DomainRow) {
    setEditingId(row.id);
    setForm({
      hostname: row.hostname,
      subdomain: row.subdomain ?? "",
      sslEnabled: row.sslEnabled,
      proxyPass: row.proxyPass ?? "",
      rootPath: row.rootPath ?? "",
      targetPort: row.targetPort ?? undefined,
      nginxConfigPath: row.nginxConfigPath ?? "",
      applicationId: row.applicationId ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateDomainAction(editingId, form)
        : await createDomainAction(form);

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
      await deleteDomainAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  function setField<K extends keyof DomainInput>(key: K, value: DomainInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Domain
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={domains}
        emptyMessage="No domains found"
        columns={[
          { key: "hostname", header: "Hostname" },
          { key: "subdomain", header: "Subdomain" },
          {
            key: "sslEnabled",
            header: "SSL",
            render: (row) => (row.sslEnabled ? "Yes" : "No"),
          },
          { key: "targetPort", header: "Port" },
          {
            key: "proxyPass",
            header: "Proxy",
            className: "font-mono text-xs",
          },
          {
            key: "application",
            header: "Application",
            render: (row) => row.application?.name ?? "—",
          },
          {
            key: "discovered",
            header: "Source",
            render: (row) => (
              <StatusBadge
                status={row.discovered ? "discovered" : "manual"}
                variant={row.discovered ? "success" : "default"}
              />
            ),
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "",
                  render: (row: DomainRow) => (
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Domain" : "New Domain"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save Changes" : "Create"}
        isLoading={isPending}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            value={form.hostname}
            onChange={(v) => setField("hostname", v)}
            isRequired
            className="md:col-span-2"
          >
            <Label>Hostname</Label>
            <Input placeholder="app.example.com" />
          </TextField>

          <TextField
            value={form.subdomain ?? ""}
            onChange={(v) => setField("subdomain", v)}
          >
            <Label>Subdomain</Label>
            <Input placeholder="app" />
          </TextField>

          <FormSelect
            label="Application"
            name="applicationId"
            value={form.applicationId ?? ""}
            onChange={(v) => setField("applicationId", v)}
            options={applications}
          />

          <TextField
            value={form.targetPort?.toString() ?? ""}
            onChange={(v) =>
              setField("targetPort", v ? parseInt(v, 10) : undefined)
            }
          >
            <Label>Target Port</Label>
            <Input type="number" placeholder="5006" />
          </TextField>

          <TextField
            value={form.proxyPass ?? ""}
            onChange={(v) => setField("proxyPass", v)}
          >
            <Label>Proxy Pass</Label>
            <Input className="font-mono" placeholder="http://localhost:5006" />
          </TextField>

          <TextField
            value={form.rootPath ?? ""}
            onChange={(v) => setField("rootPath", v)}
          >
            <Label>Root Path</Label>
            <Input className="font-mono" placeholder="D:/sites/..." />
          </TextField>

          <TextField
            value={form.nginxConfigPath ?? ""}
            onChange={(v) => setField("nginxConfigPath", v)}
            className="md:col-span-2"
          >
            <Label>Nginx Config Path</Label>
            <Input className="font-mono" />
          </TextField>

          <FormCheckbox
            label="SSL Enabled"
            name="sslEnabled"
            checked={form.sslEnabled ?? false}
            onChange={(v) => setField("sslEnabled", v)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 mt-4 bg-red-950/50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </EntityModal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Domain"
        message="This will permanently remove the domain record."
        isLoading={isPending}
      />
    </>
  );
}
