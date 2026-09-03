"use client";

import { Modal, Button } from "@heroui/react";
import { shortSha } from "@/lib/deployments/format";

export type DeployPreview = {
  application: string;
  applicationId: string;
  server: string;
  environment: string | null;
  branch: string;
  currentCommit: string | null;
  targetCommit: string | null;
  behind: number;
  runtime: string;
  action: string;
  gitWarning: string | null;
};

interface DeployConfirmDialogProps {
  isOpen: boolean;
  preview: DeployPreview | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-slate-200/70 dark:border-slate-800/70 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 dark:text-slate-100 font-medium text-right">{value}</span>
    </div>
  );
}

export function DeployConfirmDialog({
  isOpen,
  preview,
  isLoading,
  onClose,
  onConfirm,
}: DeployConfirmDialogProps) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
      variant="opaque"
      isDismissable={!isLoading}
    >
      <Modal.Container placement="center" size="md" scroll="inside">
        <Modal.Dialog className="acdm-card text-slate-900 dark:text-slate-100 w-full max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="acdm-card-title">
              {preview ? `Deploy ${preview.application}?` : "Deploy"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {preview ? (
              <div>
                <Row label="Server" value={preview.server} />
                {preview.environment && (
                  <Row label="Environment" value={preview.environment} />
                )}
                <Row label="Branch" value={preview.branch} />
                <Row label="Current" value={shortSha(preview.currentCommit)} />
                <Row label="Target" value={shortSha(preview.targetCommit)} />
                <Row
                  label="Commits"
                  value={
                    preview.behind > 0
                      ? `${preview.behind} commit${preview.behind === 1 ? "" : "s"} will be deployed`
                      : "Working tree is current — rebuild/reload only"
                  }
                />
                <Row label="Runtime" value={preview.runtime} />
                <p className="text-xs text-slate-500 mt-3">{preview.action}</p>
                {preview.gitWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Git warning: {preview.gitWarning}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Preparing deployment…</p>
            )}
          </Modal.Body>
          <Modal.Footer className="flex gap-2 justify-end">
            <Button variant="ghost" slot="close" isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={onConfirm}
              isDisabled={isLoading || !preview}
            >
              {isLoading ? "Starting…" : "Deploy"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
