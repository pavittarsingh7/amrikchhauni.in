"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal, ConfirmDialog } from "@/components/crud/entity-modal";
import { FormCheckbox, FormSelect } from "@/components/crud/form-fields";
import { RowActions } from "@/components/crud/row-actions";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/actions/users";
import type { UserInput } from "@/lib/validations/crud";

type UserRow = {
  id: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: Date;
};

const ROLES = [
  { id: "SUPER_ADMIN", name: "Super Admin" },
  { id: "ADMINISTRATOR", name: "Administrator" },
  { id: "VIEWER", name: "Viewer" },
];

const emptyForm: UserInput = { username: "", password: "", role: "VIEWER", active: true };

interface UsersManagerProps {
  users: UserRow[];
  currentUserId: string;
}

export function UsersManager({ users, currentUserId }: UsersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditingId(row.id);
    setForm({ username: row.username, password: "", role: row.role as UserInput["role"], active: row.active });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateUserAction(editingId, form)
        : await createUserAction(form);
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
      await deleteUserAction(deleteId);
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" onPress={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <DataTable
        keyField="id"
        data={users}
        emptyMessage="No users"
        columns={[
          { key: "username", header: "Username" },
          { key: "role", header: "Role", render: (r) => <StatusBadge status={r.role} /> },
          {
            key: "active",
            header: "Status",
            render: (r) => (
              <StatusBadge status={r.active ? "active" : "inactive"} variant={r.active ? "success" : "default"} />
            ),
          },
          {
            key: "createdAt",
            header: "Created",
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
          {
            key: "actions",
            header: "",
            render: (row: UserRow) => (
              <RowActions
                onEdit={() => openEdit(row)}
                onDelete={() => setDeleteId(row.id)}
                readOnly={row.id === currentUserId}
              />
            ),
          },
        ]}
      />

      <EntityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit User" : "Add User"}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Save" : "Create"}
        isLoading={isPending}
      >
        <div className="space-y-4">
          <TextField value={form.username} onChange={(v) => setForm({ ...form, username: v })} isRequired>
            <Label>Username</Label>
            <Input />
          </TextField>
          <TextField value={form.password ?? ""} onChange={(v) => setForm({ ...form, password: v })} isRequired={!editingId}>
            <Label>{editingId ? "New Password (leave blank to keep)" : "Password"}</Label>
            <Input type="password" />
          </TextField>
          <FormSelect label="Role" name="role" value={form.role ?? "VIEWER"} onChange={(v) => setForm({ ...form, role: v as UserInput["role"] })} options={ROLES} />
          <FormCheckbox label="Active" name="active" checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </EntityModal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete User" message="Permanently remove this user account?" isLoading={isPending} />
    </>
  );
}
