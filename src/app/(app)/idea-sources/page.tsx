import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { IdeaSourcesManager } from "@/components/idea-sources/idea-sources-manager";
import { listIdeaSources } from "@/lib/idea-sources/service";

export default async function IdeaSourcesPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const items = await listIdeaSources();

  return (
    <div className="p-6">
      <PageHeader title="Idea Sources" description="Track project origin and ownership" />
      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Idea Sources ({items.length})</Card.Title>
        </Card.Header>
        <Card.Content>
          <IdeaSourcesManager items={items} readOnly={readOnly} />
        </Card.Content>
      </Card>
    </div>
  );
}
