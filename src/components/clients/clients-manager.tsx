"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormCheckbox, FormTextarea } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/actions/clients";
import type { ClientInput } from "@/lib/validations/crud";

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  _count: { applications: number };
};

const emptyForm: ClientInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  notes: "",
  active: true,
};

interface ClientsManagerProps {
  clients: ClientRow[];
  readOnly?: boolean;
}

export function ClientsManager({ clients, readOnly = false }: ClientsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: ClientRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      company: row.company ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      active: row.active,
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateClientAction(editingId, form)
        : await createClientAction(form);
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
      await deleteClientAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={clients}
        emptyMessage="No clients yet"
        columns={[
          { key: "name", header: "Name" },
          { key: "company", header: "Company", render: (r) => r.company ?? "—" },
          { key: "email", header: "Email", render: (r) => r.email ?? "—" },
          {
            key: "active",
            header: "Status",
            render: (r) => (
              <StatusBadge status={r.active ? "active" : "inactive"} variant={r.active ? "success" : "default"} />
            ),
          },
          {
            key: "apps",
            header: "Apps",
            render: (r) => r._count.applications,
          },
          {
            key: "actions",
            header: "",
            render: (row: ClientRow) => (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} readOnly={readOnly} />
            ),
          },
        ]}
      />

      <EntityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Client" : "Add Client"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save" : "Create"}
        isLoading={isPending}
      >
        <div className="space-y-4">
          <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired>
            <Label>Name</Label>
            <Input />
          </TextField>
          <TextField value={form.company ?? ""} onChange={(v) => setForm({ ...form, company: v })}>
            <Label>Company</Label>
            <Input />
          </TextField>
          <TextField value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })}>
            <Label>Email</Label>
            <Input type="email" />
          </TextField>
          <TextField value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })}>
            <Label>Phone</Label>
            <Input />
          </TextField>
          <FormTextarea label="Notes" name="notes" value={form.notes ?? ""} onChange={(v) => setForm({ ...form, notes: v })} />
          <FormCheckbox label="Active" name="active" checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </EntityModal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Client" message="Remove this client record?" isLoading={isPending} />
    </>
  );
}
