"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Power, PowerOff } from "lucide-react";
import { Card } from "@heroui/react";
import { FormTextarea } from "@/components/crud/form-fields";
import { StatusBadge } from "@/components/ui/data-table";
import {
  updateMaintenancePageAction,
  toggleSiteMaintenanceAction,
  toggleServerMaintenanceAction,
} from "@/actions/maintenance";

type MaintenancePageData = {
  id: string;
  title: string;
  description: string | null;
  expectedReturn: string | null;
  logoPath: string | null;
} | null;

type MaintenanceConfigRow = {
  id: string;
  scope: string;
  enabled: boolean;
  domain: { id: string; hostname: string } | null;
  application: { id: string; name: string } | null;
};

interface MaintenanceManagerProps {
  page: MaintenancePageData;
  configs: MaintenanceConfigRow[];
  domains: { id: string; hostname: string; maintenanceEnabled: boolean }[];
  serverWideEnabled: boolean;
  isSuperAdmin: boolean;
  readOnly?: boolean;
}

export function MaintenanceManager({
  page,
  configs,
  domains,
  serverWideEnabled,
  isSuperAdmin,
  readOnly = false,
}: MaintenanceManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(page?.title ?? "Under Maintenance");
  const [description, setDescription] = useState(page?.description ?? "");
  const [expectedReturn, setExpectedReturn] = useState(page?.expectedReturn ?? "");
  const [logoPath, setLogoPath] = useState(page?.logoPath ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function savePage() {
    startTransition(async () => {
      const result = await updateMaintenancePageAction({
        title,
        description,
        expectedReturn,
        logoPath,
      });
      setMessage(result.error ?? "Page content saved");
      router.refresh();
    });
  }

  function toggleSite(domainId: string, enabled: boolean) {
    startTransition(async () => {
      const result = await toggleSiteMaintenanceAction(domainId, enabled);
      setMessage(result.error ?? result.output ?? "Updated");
      router.refresh();
    });
  }

  function toggleServer(enabled: boolean) {
    startTransition(async () => {
      const result = await toggleServerMaintenanceAction(enabled);
      setMessage(result.error ?? result.output ?? "Updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className="text-sm text-blue-400 bg-blue-950/30 px-3 py-2 rounded-lg">
          {message}
        </p>
      )}

      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">Maintenance Page Content</Card.Title>
          <Card.Description>
            Auto-generated to D:\server-config\maintenance\page.html
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <TextField value={title} onChange={setTitle} isDisabled={readOnly}>
            <Label>Title</Label>
            <Input />
          </TextField>
          <FormTextarea
            label="Description"
            name="description"
            value={description}
            onChange={setDescription}
            disabled={readOnly}
          />
          <TextField value={expectedReturn} onChange={setExpectedReturn} isDisabled={readOnly}>
            <Label>Expected Return</Label>
            <Input placeholder="Shortly / 2:00 PM IST" />
          </TextField>
          <TextField value={logoPath} onChange={setLogoPath} isDisabled={readOnly}>
            <Label>Logo URL</Label>
            <Input placeholder="https://..." />
          </TextField>
          {!readOnly && (
            <Button variant="primary" onPress={savePage} isDisabled={isPending}>
              Save Page Content
            </Button>
          )}
        </Card.Content>
      </Card>

      {isSuperAdmin && (
        <Card className="bg-slate-900 border border-slate-800">
          <Card.Header>
            <Card.Title className="text-white">Server-Wide Maintenance</Card.Title>
            <Card.Description>
              Puts all sites into maintenance mode via nginx map
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="flex items-center gap-4">
              <StatusBadge
                status={serverWideEnabled ? "ENABLED" : "DISABLED"}
                variant={serverWideEnabled ? "warning" : "default"}
              />
              <Button
                variant={serverWideEnabled ? "danger" : "primary"}
                onPress={() => toggleServer(!serverWideEnabled)}
                isDisabled={isPending}
                className="gap-2"
              >
                {serverWideEnabled ? (
                  <>
                    <PowerOff className="w-4 h-4" /> Disable Server Maintenance
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" /> Enable Server Maintenance
                  </>
                )}
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      <Card className="bg-slate-900 border border-slate-800">
        <Card.Header>
          <Card.Title className="text-white">Per-Site Maintenance</Card.Title>
          <Card.Description>
            Uses generated nginx map — original site configs are not modified
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/30"
              >
                <span className="font-mono text-sm">{d.hostname}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={d.maintenanceEnabled ? "ON" : "OFF"}
                    variant={d.maintenanceEnabled ? "warning" : "default"}
                  />
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant={d.maintenanceEnabled ? "ghost" : "secondary"}
                      isDisabled={isPending}
                      onPress={() => toggleSite(d.id, !d.maintenanceEnabled)}
                    >
                      {d.maintenanceEnabled ? "Disable" : "Enable"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {domains.length === 0 && (
              <p className="text-sm text-slate-500">No domains registered</p>
            )}
          </div>
        </Card.Content>
      </Card>

      {configs.length > 0 && (
        <p className="text-xs text-slate-600">
          {configs.filter((c) => c.enabled).length} active maintenance config(s)
        </p>
      )}
    </div>
  );
}
