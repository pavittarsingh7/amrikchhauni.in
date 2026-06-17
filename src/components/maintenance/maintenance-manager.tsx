"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Eye, Power, PowerOff } from "lucide-react";
import { Card } from "@heroui/react";
import { FormTextarea } from "@/components/crud/form-fields";
import { StatusBadge } from "@/components/ui/data-table";
import { MaintenancePreviewDialog } from "@/components/maintenance/maintenance-preview-dialog";
import {
  updateMaintenancePageAction,
  toggleSiteMaintenanceAction,
  toggleServerMaintenanceAction,
  previewSiteMaintenanceAction,
  previewServerMaintenanceAction,
} from "@/actions/maintenance";
import type { MaintenancePreview } from "@/lib/maintenance/service";

type MaintenancePageData = {
  id: string;
  title: string;
  description: string | null;
  expectedReturn: string | null;
  logoPath: string | null;
} | null;

interface MaintenanceManagerProps {
  page: MaintenancePageData;
  domains: { id: string; hostname: string; maintenanceEnabled: boolean }[];
  serverWideEnabled: boolean;
  isSuperAdmin: boolean;
  readOnly?: boolean;
}

type PendingAction =
  | { type: "site"; domainId: string; hostname: string; enabled: boolean }
  | { type: "server"; enabled: boolean };

export function MaintenanceManager({
  page,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previews, setPreviews] = useState<MaintenancePreview[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  function savePage() {
    startTransition(async () => {
      const result = await updateMaintenancePageAction({
        title,
        description,
        expectedReturn,
        logoPath,
      });
      setMessage(result.error ?? "Page content saved to index.html");
      router.refresh();
    });
  }

  function openSitePreview(domainId: string, hostname: string, enabled: boolean) {
    startTransition(async () => {
      const result = await previewSiteMaintenanceAction(domainId, enabled);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setPendingAction({ type: "site", domainId, hostname, enabled });
      setPreviewTitle(
        `${enabled ? "Enable" : "Disable"} maintenance — ${hostname}`
      );
      setPreviews(result.preview ? [result.preview] : []);
      setPreviewOpen(true);
    });
  }

  function openServerPreview(enabled: boolean) {
    startTransition(async () => {
      const result = await previewServerMaintenanceAction(enabled);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setPendingAction({ type: "server", enabled });
      setPreviewTitle(
        enabled
          ? "Enable server-wide maintenance"
          : "Disable server-wide maintenance"
      );
      setPreviews(result.previews ?? []);
      setPreviewOpen(true);
    });
  }

  function applyPendingAction() {
    if (!pendingAction) return;

    startTransition(async () => {
      let result;
      if (pendingAction.type === "site") {
        result = await toggleSiteMaintenanceAction(
          pendingAction.domainId,
          pendingAction.enabled
        );
      } else {
        result = await toggleServerMaintenanceAction(pendingAction.enabled);
      }

      setPreviewOpen(false);
      setPendingAction(null);
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

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Maintenance Page Content</Card.Title>
          <Card.Description>
            Served from D:\server-config\maintenance\index.html via nginx static
            root
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <TextField value={title} onChange={setTitle} isDisabled={readOnly}>
            <Label className="text-slate-300">Title</Label>
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
            <Label className="text-slate-300">Expected Return</Label>
            <Input placeholder="Shortly / 2:00 PM IST" />
          </TextField>
          <TextField value={logoPath} onChange={setLogoPath} isDisabled={readOnly}>
            <Label className="text-slate-300">Logo URL</Label>
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
        <Card className="acdm-card">
          <Card.Header>
            <Card.Title className="acdm-card-title">Server-Wide Maintenance</Card.Title>
            <Card.Description>
              Swaps each site&apos;s location / block to serve the maintenance page.
              Never modifies nginx.conf, proxy-common.conf, or ssl-common.conf.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-wrap items-center gap-4">
              <StatusBadge
                status={serverWideEnabled ? "ENABLED" : "DISABLED"}
                variant={serverWideEnabled ? "warning" : "default"}
              />
              <Button
                variant="secondary"
                onPress={() => openServerPreview(!serverWideEnabled)}
                isDisabled={isPending}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                variant={serverWideEnabled ? "danger" : "primary"}
                onPress={() => openServerPreview(!serverWideEnabled)}
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

      <Card className="acdm-card">
        <Card.Header>
          <Card.Title className="acdm-card-title">Per-Site Maintenance</Card.Title>
          <Card.Description>
            Backs up the site config to D:\server-config\backups\nginx, swaps
            location / to the maintenance include, validates with nginx -t, then
            reloads. Rolls back automatically if validation fails.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800/30"
              >
                <span className="font-mono text-sm">{d.hostname}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={d.maintenanceEnabled ? "ON" : "OFF"}
                    variant={d.maintenanceEnabled ? "warning" : "default"}
                  />
                  {!readOnly && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={isPending}
                        onPress={() =>
                          openSitePreview(d.id, d.hostname, !d.maintenanceEnabled)
                        }
                        className="gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant={d.maintenanceEnabled ? "ghost" : "secondary"}
                        isDisabled={isPending}
                        onPress={() =>
                          openSitePreview(d.id, d.hostname, !d.maintenanceEnabled)
                        }
                      >
                        {d.maintenanceEnabled ? "Disable" : "Enable"}
                      </Button>
                    </>
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

      <MaintenancePreviewDialog
        isOpen={previewOpen}
        onClose={() => {
          if (!isPending) {
            setPreviewOpen(false);
            setPendingAction(null);
          }
        }}
        onApply={applyPendingAction}
        title={previewTitle}
        previews={previews}
        isLoading={isPending}
      />
    </div>
  );
}
