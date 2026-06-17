import { requireSuperAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { UsersManager } from "@/components/users/users-manager";
import { listUsers } from "@/lib/users/service";

export default async function UsersPage() {
  const session = await requireSuperAdmin();
  const users = await listUsers();

  return (
    <div className="p-6">
      <PageHeader title="Users" description="Manage user accounts and roles" />
      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">User Accounts ({users.length})</Card.Title>
          <Card.Description>Super Admin only — create, edit roles, reset passwords</Card.Description>
        </Card.Header>
        <Card.Content>
          <UsersManager users={users} currentUserId={session.id} />
        </Card.Content>
      </Card>
    </div>
  );
}
