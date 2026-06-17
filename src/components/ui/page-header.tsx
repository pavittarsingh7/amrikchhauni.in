import { Card } from "@heroui/react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && (
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <Card className="bg-slate-900 border border-slate-800">
      <Card.Content className="p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtext && (
          <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        )}
      </Card.Content>
    </Card>
  );
}

interface PlaceholderModuleProps {
  title: string;
  description: string;
  phase?: string;
}

export function PlaceholderModule({
  title,
  description,
  phase,
}: PlaceholderModuleProps) {
  return (
    <div className="p-6">
      <PageHeader title={title} description={description} />
      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-slate-300">
            Module Under Development
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-slate-400">
            This module will be implemented in{" "}
            {phase ?? "a future phase"}. The database schema and navigation
            structure are ready.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
