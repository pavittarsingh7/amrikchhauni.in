"use client";

import { useEffect, useRef } from "react";
import { Modal, Button } from "@heroui/react";
import { StatusBadge } from "@/components/ui/data-table";
import { formatDuration, formatTimestamp, deploymentStatusVariant } from "@/lib/deployments/format";

export type DeploymentLogRow = {
  id: string;
  sequence: number;
  applicationName: string;
  serverName: string | null;
  branch: string | null;
  status: string;
  currentStage: string | null;
  failedStage: string | null;
  exitCode: number | null;
  error: string | null;
  log: string;
  commitBefore: string | null;
  commitAfter: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  durationMs: number | null;
  triggeredByUsername: string | null;
};

interface DeploymentLogsDialogProps {
  isOpen: boolean;
  deployment: DeploymentLogRow | null;
  onClose: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export function DeploymentLogsDialog({
  isOpen,
  deployment,
  onClose,
  onCancel,
  canCancel,
}: DeploymentLogsDialogProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const live = deployment?.status === "QUEUED" || deployment?.status === "RUNNING";

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [deployment?.log]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      variant="opaque"
    >
      <Modal.Container placement="center" size="lg" scroll="inside">
        <Modal.Dialog className="acdm-card text-slate-900 dark:text-slate-100 w-full max-w-4xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="acdm-card-title">
              {deployment ? `Deployment #${deployment.sequence}` : "Deployment"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {deployment ? (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <StatusBadge
                    status={deployment.status}
                    variant={deploymentStatusVariant(deployment.status)}
                  />
                  {deployment.currentStage && (
                    <span className="text-slate-500">{deployment.currentStage}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-slate-500">Application: </span>
                    {deployment.applicationName}
                  </p>
                  <p>
                    <span className="text-slate-500">Server: </span>
                    {deployment.serverName ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Branch: </span>
                    {deployment.branch ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Triggered by: </span>
                    {deployment.triggeredByUsername ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Started: </span>
                    {formatTimestamp(deployment.startedAt)}
                  </p>
                  <p>
                    <span className="text-slate-500">Duration: </span>
                    {formatDuration(deployment.durationMs)}
                  </p>
                </div>
                {deployment.status === "FAILED" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/40">
                    <p className="font-medium text-red-700 dark:text-red-400">Deployment failed</p>
                    {deployment.failedStage && (
                      <p className="text-red-600 dark:text-red-300">Stage: {deployment.failedStage}</p>
                    )}
                    {deployment.exitCode != null && (
                      <p className="text-red-600 dark:text-red-300">
                        Command exited with code {deployment.exitCode}.
                      </p>
                    )}
                    {deployment.error && (
                      <p className="text-red-600 dark:text-red-300 mt-1">{deployment.error}</p>
                    )}
                  </div>
                )}
                <pre
                  ref={preRef}
                  className="text-xs text-green-700 dark:text-green-400 font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 max-h-[50vh] overflow-auto whitespace-pre-wrap"
                >
                  {deployment.log || (live ? "Waiting for logs…" : "No logs")}
                </pre>
              </>
            ) : (
              <p className="text-sm text-slate-500">Loading deployment…</p>
            )}
          </Modal.Body>
          <Modal.Footer className="flex gap-2 justify-end">
            {canCancel && live && onCancel && (
              <Button variant="danger" onPress={onCancel}>
                Cancel deployment
              </Button>
            )}
            <Button variant="ghost" slot="close">
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
