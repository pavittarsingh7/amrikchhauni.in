"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus, Wand2 } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormSelect, FormTextarea } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createPortAction,
  createPortAutoAssignAction,
  updatePortAction,
  deletePortAction,
  getNextAvailablePortAction,
} from "@/actions/ports";
import type { PortInput } from "@/lib/validations/crud";

type PortRow = {
  id: string;
  number: number;
  status: string;
  applicationId: string | null;
  notes: string | null;
  application: { id: string; name: string } | null;
};

const STATUS_OPTIONS = [
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "UNDER_CONSTRUCTION",
] as const;

const emptyForm: PortInput = {
  number: 0,
  status: "AVAILABLE",
  applicationId: "",
  notes: "",
};

interface PortsManagerProps {
  ports: PortRow[];
  applications: { id: string; name: string }[];
  readOnly?: boolean;
}

export function PortsManager({
  ports,
  applications,
  readOnly = false,
}: PortsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PortInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function openCreate() {
    setEditingId(null);
    setError(null);
    const result = await getNextAvailablePortAction();
    setForm({
      ...emptyForm,
      number: result.nextPort ?? 4000,
    });
    setModalOpen(true);
  }

  function openEdit(row: PortRow) {
    setEditingId(row.id);
    setForm({
      number: row.number,
      status: row.status as PortInput["status"],
      applicationId: row.applicationId ?? "",
      notes: row.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updatePortAction(editingId, form)
        : await createPortAction(form);

      if (result.error) {
        setError(result.error);
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  }

  function handleAutoAssign() {
    startTransition(async () => {
      const result = await createPortAutoAssignAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      await deletePortAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  function setField<K extends keyof PortInput>(key: K, value: PortInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="secondary"
            onPress={handleAutoAssign}
            isDisabled={isPending}
            className="gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Auto-Assign Port
          </Button>
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Port
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={ports}
        emptyMessage="No ports registered"
        columns={[
          { key: "number", header: "Port" },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge status={String(row.status).replace(/_/g, " ")} />
            ),
          },
          {
            key: "application",
            header: "Application",
            render: (row) => row.application?.name ?? "—",
          },
          {
            key: "notes",
            header: "Notes",
            className: "text-xs text-slate-500",
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "",
                  render: (row: PortRow) => (
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
        title={editingId ? "Edit Port" : "New Port"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save Changes" : "Create"}
        isLoading={isPending}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            value={form.number.toString()}
            onChange={(v) => setField("number", parseInt(v, 10) || 0)}
            isRequired
          >
            <Label>Port Number</Label>
            <Input type="number" min={1} max={65535} />
          </TextField>

          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(v) => setField("status", v as PortInput["status"])}
            options={STATUS_OPTIONS.map((s) => ({
              id: s,
              name: s.replace(/_/g, " "),
            }))}
          />

          <FormSelect
            label="Application"
            name="applicationId"
            value={form.applicationId ?? ""}
            onChange={(v) => setField("applicationId", v)}
            options={applications}
            placeholder="Unassigned"
          />

          <div className="md:col-span-2">
            <FormTextarea
              label="Notes"
              name="notes"
              value={form.notes ?? ""}
              onChange={(v) => setField("notes", v)}
              rows={2}
            />
          </div>
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
        title="Delete Port"
        message="This will remove the port from the registry."
        isLoading={isPending}
      />
    </>
  );
}
