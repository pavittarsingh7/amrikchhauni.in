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
  createIdeaSourceAction,
  updateIdeaSourceAction,
  deleteIdeaSourceAction,
} from "@/actions/idea-sources";
import type { IdeaSourceInput } from "@/lib/validations/crud";

type Row = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  _count: { applications: number };
};

const emptyForm: IdeaSourceInput = { name: "", description: "", active: true };

interface Props {
  items: Row[];
  readOnly?: boolean;
}

export function IdeaSourcesManager({ items, readOnly = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IdeaSourceInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    setForm({ name: row.name, description: row.description ?? "", active: row.active });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateIdeaSourceAction(editingId, form)
        : await createIdeaSourceAction(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Idea Source
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={items}
        emptyMessage="No idea sources"
        columns={[
          { key: "name", header: "Name" },
          { key: "description", header: "Description", className: "max-w-xs truncate", render: (r) => r.description ?? "—" },
          { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} variant={r.active ? "success" : "default"} /> },
          { key: "apps", header: "Apps", render: (r) => r._count.applications },
          { key: "actions", header: "", render: (row: Row) => <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} readOnly={readOnly} /> },
        ]}
      />

      <EntityModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Idea Source" : "Add Idea Source"} onSubmit={handleSubmit} submitLabel={editingId ? "Save" : "Create"} isLoading={isPending}>
        <div className="space-y-4">
          <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired><Label>Name</Label><Input /></TextField>
          <FormTextarea label="Description" name="description" value={form.description ?? ""} onChange={(v) => setForm({ ...form, description: v })} />
          <FormCheckbox label="Active" name="active" checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </EntityModal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) startTransition(async () => { await deleteIdeaSourceAction(deleteId); setDeleteId(null); router.refresh(); }); }} title="Delete Idea Source" message="Remove this idea source?" isLoading={isPending} />
    </>
  );
}
