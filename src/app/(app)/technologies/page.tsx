import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@heroui/react";
import { TechnologiesManager } from "@/components/technologies/technologies-manager";
import { listTechnologies } from "@/lib/technologies/service";

export default async function TechnologiesPage() {
  const session = await getSession();
  const readOnly = session?.role === "VIEWER";
  const items = await listTechnologies();

  return (
    <div className="p-6">
      <PageHeader title="Technologies" description="Technology stack master data" />
      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">Technologies ({items.length})</Card.Title>
        </Card.Header>
        <Card.Content>
          <TechnologiesManager items={items} readOnly={readOnly} />
        </Card.Content>
      </Card>
    </div>
  );
}
