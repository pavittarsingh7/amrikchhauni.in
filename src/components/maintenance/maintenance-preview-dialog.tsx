"use client";

import { Modal, Button } from "@heroui/react";
import type { MaintenancePreview } from "@/lib/maintenance/service";

interface MaintenancePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  title: string;
  previews: MaintenancePreview[];
  isLoading?: boolean;
}

function ConfigBlock({
  label,
  content,
  variant,
}: {
  label: string;
  content: string;
  variant: "original" | "proposed";
}) {
  return (
    <div className="space-y-2">
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          variant === "original" ? "text-slate-400" : "text-indigo-400"
        }`}
      >
        {label}
      </p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {content}
      </pre>
    </div>
  );
}

export function MaintenancePreviewDialog({
  isOpen,
  onClose,
  onApply,
  title,
  previews,
  isLoading,
}: MaintenancePreviewDialogProps) {
  const actionable = previews.filter((p) => p.action !== "no-change");
  const hasChanges = actionable.length > 0;

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
      variant="opaque"
      isDismissable={!isLoading}
    >
      <Modal.Container placement="center" size="lg" scroll="inside">
        <Modal.Dialog className="acdm-card text-slate-900 dark:text-slate-100 w-full max-w-4xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="acdm-card-title">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="max-h-[75vh] overflow-y-auto space-y-6">
            {!hasChanges ? (
              <p className="text-sm text-slate-400">
                No nginx configuration changes required for this action.
              </p>
            ) : (
              actionable.map((preview) => (
                <div
                  key={preview.hostname}
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm text-slate-900 dark:text-white">
                      {preview.hostname}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        preview.action === "enable"
                          ? "bg-amber-950/60 text-amber-300 ring-1 ring-amber-800"
                          : "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-800"
                      }`}
                    >
                      {preview.action === "enable"
                        ? "Enable maintenance"
                        : "Restore live"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{preview.nginxConfigPath}</p>
                  <ConfigBlock
                    label="Current config"
                    content={preview.original}
                    variant="original"
                  />
                  <div className="flex justify-center text-slate-600">
                    <span aria-hidden="true">↓</span>
                  </div>
                  <ConfigBlock
                    label="After apply"
                    content={preview.proposed}
                    variant="proposed"
                  />
                </div>
              ))
            )}
            <p className="text-xs text-slate-500">
              Nginx will be tested with <code className="text-slate-400">nginx -t</code>{" "}
              before reload. On failure, all changes roll back automatically.
            </p>
          </Modal.Body>
          <Modal.Footer className="flex gap-2 justify-end">
            <Button variant="ghost" slot="close" isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={onApply}
              isDisabled={isLoading || !hasChanges}
            >
              {isLoading ? "Applying..." : "Apply"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
