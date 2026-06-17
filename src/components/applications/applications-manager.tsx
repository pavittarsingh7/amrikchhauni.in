"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormSelect, FormCheckbox, FormTextarea } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createApplicationAction,
  updateApplicationAction,
  deleteApplicationAction,
} from "@/actions/applications";
import type { ApplicationInput } from "@/lib/validations/crud";

type ApplicationRow = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  clientId: string | null;
  ideaSourceId: string | null;
  technologyId: string | null;
  deploymentTypeId: string | null;
  repositoryUrl: string | null;
  branch: string | null;
  projectPath: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  notes: string | null;
  remarks: string | null;
  featured: boolean;
  technology: { name: string } | null;
  deploymentType: { name: string } | null;
  ideaSource: { name: string } | null;
  client: { name: string } | null;
};

type FormOptions = {
  clients: { id: string; name: string }[];
  ideaSources: { id: string; name: string }[];
  technologies: { id: string; name: string }[];
  deploymentTypes: { id: string; name: string }[];
};

const STATUS_OPTIONS = [
  "LIVE",
  "PLANNED",
  "BETA",
  "UNDER_CONSTRUCTION",
  "ARCHIVED",
] as const;

const emptyForm: ApplicationInput = {
  name: "",
  description: "",
  clientId: "",
  ideaSourceId: "",
  technologyId: "",
  deploymentTypeId: "",
  repositoryUrl: "",
  branch: "main",
  projectPath: "",
  buildCommand: "",
  startCommand: "",
  status: "PLANNED",
  notes: "",
  remarks: "",
  featured: false,
};

interface ApplicationsManagerProps {
  applications: ApplicationRow[];
  formOptions: FormOptions;
  readOnly?: boolean;
}

export function ApplicationsManager({
  applications,
  formOptions,
  readOnly = false,
}: ApplicationsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApplicationInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: ApplicationRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description ?? "",
      clientId: row.clientId ?? "",
      ideaSourceId: row.ideaSourceId ?? "",
      technologyId: row.technologyId ?? "",
      deploymentTypeId: row.deploymentTypeId ?? "",
      repositoryUrl: row.repositoryUrl ?? "",
      branch: row.branch ?? "main",
      projectPath: row.projectPath ?? "",
      buildCommand: row.buildCommand ?? "",
      startCommand: row.startCommand ?? "",
      status: row.status as ApplicationInput["status"],
      notes: row.notes ?? "",
      remarks: row.remarks ?? "",
      featured: row.featured,
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateApplicationAction(editingId, form)
        : await createApplicationAction(form);

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
      await deleteApplicationAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  function setField<K extends keyof ApplicationInput>(
    key: K,
    value: ApplicationInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <Button variant="primary" onPress={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Application
          </Button>
        </div>
      )}

      <DataTable
        keyField="id"
        data={applications}
        emptyMessage="No applications registered"
        columns={[
          { key: "name", header: "Name" },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "technology",
            header: "Technology",
            render: (row) => row.technology?.name ?? "—",
          },
          {
            key: "deploymentType",
            header: "Deploy",
            render: (row) => row.deploymentType?.name ?? "—",
          },
          {
            key: "client",
            header: "Client",
            render: (row) => row.client?.name ?? "—",
          },
          {
            key: "projectPath",
            header: "Path",
            className: "font-mono text-xs max-w-[200px] truncate",
          },
          ...(!readOnly
            ? [
                {
                  key: "actions",
                  header: "",
                  render: (row: ApplicationRow) => (
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
        title={editingId ? "Edit Application" : "New Application"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save Changes" : "Create"}
        isLoading={isPending}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField value={form.name} onChange={(v) => setField("name", v)} isRequired>
            <Label>Name</Label>
            <Input />
          </TextField>

          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(v) => setField("status", v as ApplicationInput["status"])}
            options={STATUS_OPTIONS.map((s) => ({ id: s, name: s.replace(/_/g, " ") }))}
            placeholder="Select status"
          />

          <FormSelect
            label="Technology"
            name="technologyId"
            value={form.technologyId ?? ""}
            onChange={(v) => setField("technologyId", v)}
            options={formOptions.technologies}
          />

          <FormSelect
            label="Deployment Type"
            name="deploymentTypeId"
            value={form.deploymentTypeId ?? ""}
            onChange={(v) => setField("deploymentTypeId", v)}
            options={formOptions.deploymentTypes}
          />

          <FormSelect
            label="Idea Source"
            name="ideaSourceId"
            value={form.ideaSourceId ?? ""}
            onChange={(v) => setField("ideaSourceId", v)}
            options={formOptions.ideaSources}
          />

          <FormSelect
            label="Client"
            name="clientId"
            value={form.clientId ?? ""}
            onChange={(v) => setField("clientId", v)}
            options={formOptions.clients}
          />

          <TextField
            value={form.repositoryUrl ?? ""}
            onChange={(v) => setField("repositoryUrl", v)}
            className="md:col-span-2"
          >
            <Label>Repository URL</Label>
            <Input placeholder="https://github.com/..." />
          </TextField>

          <TextField value={form.branch ?? ""} onChange={(v) => setField("branch", v)}>
            <Label>Branch</Label>
            <Input />
          </TextField>

          <TextField
            value={form.projectPath ?? ""}
            onChange={(v) => setField("projectPath", v)}
          >
            <Label>Project Path</Label>
            <Input className="font-mono" placeholder="D:\projects\..." />
          </TextField>

          <TextField
            value={form.buildCommand ?? ""}
            onChange={(v) => setField("buildCommand", v)}
          >
            <Label>Build Command</Label>
            <Input className="font-mono" placeholder="npm run build" />
          </TextField>

          <TextField
            value={form.startCommand ?? ""}
            onChange={(v) => setField("startCommand", v)}
          >
            <Label>Start Command</Label>
            <Input className="font-mono" placeholder="npm start" />
          </TextField>

          <div className="md:col-span-2">
            <FormTextarea
              label="Description"
              name="description"
              value={form.description ?? ""}
              onChange={(v) => setField("description", v)}
            />
          </div>

          <FormTextarea
            label="Notes"
            name="notes"
            value={form.notes ?? ""}
            onChange={(v) => setField("notes", v)}
          />

          <FormTextarea
            label="Remarks"
            name="remarks"
            value={form.remarks ?? ""}
            onChange={(v) => setField("remarks", v)}
          />

          <FormCheckbox
            label="Featured"
            name="featured"
            checked={form.featured ?? false}
            onChange={(v) => setField("featured", v)}
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
        title="Delete Application"
        message="This will remove the application record. Linked domains and ports will be unlinked."
        isLoading={isPending}
      />
    </>
  );
}
