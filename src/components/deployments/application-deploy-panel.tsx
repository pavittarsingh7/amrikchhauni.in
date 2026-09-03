"use client";

import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { StatusBadge } from "@/components/ui/data-table";
import {
  deploymentStatusVariant,
  formatDuration,
  formatTimestamp,
  shortSha,
} from "@/lib/deployments/format";

type Detail = {
  application: {
    id: string;
    name: string;
    status: string;
    repositoryUrl: string | null;
    provider: string | null;
    branch: string;
    projectPath: string | null;
    buildCommand: string | null;
    startCommand: string | null;
    technology: string | null;
    runtime: string | null;
    runtimeSummary: string;
  };
  server: {
    id: string;
    name: string;
    hostname: string;
    environment: string;
  } | null;
  git: {
    localCommit: string | null;
    remoteCommit: string | null;
    ahead: number;
    behind: number;
    dirty: boolean;
    lastFetchedAt: Date | string | null;
    lastError: string | null;
    stale: boolean;
  } | null;
  domains: { id: string; hostname: string; sslEnabled: boolean; targetPort: number | null }[];
  ports: { id: string; number: number; status: string }[];
  pm2Processes: { id: string; name: string; status: string | null; port: number | null }[];
  iisSites: {
    id: string;
    name: string;
    state: string | null;
    appPool: string | null;
    physicalPath: string | null;
  }[];
  lastDeployment: {
    id: string;
    sequence: number;
    status: string;
    durationMs: number | null;
    createdAt: Date | string;
    completedAt: Date | string | null;
    failedStage: string | null;
  } | null;
  activeDeployment: { id: string; status: string } | null;
};

type Changes = {
  incoming: { sha: string; subject: string; author: string }[];
  changedFiles: string[];
} | null;

interface ApplicationDeployPanelProps {
  detail: Detail | null;
  changes: Changes;
  readOnly?: boolean;
  busy?: boolean;
  onRefresh: () => void;
  onSync: () => void;
  onDeploy: () => void;
  onViewChanges: () => void;
  onViewLastLogs: () => void;
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 break-all">{value}</p>
    </div>
  );
}

export function ApplicationDeployPanel({
  detail,
  changes,
  readOnly,
  busy,
  onRefresh,
  onSync,
  onDeploy,
  onViewChanges,
  onViewLastLogs,
}: ApplicationDeployPanelProps) {
  if (!detail) {
    return <p className="text-sm text-slate-500">Loading application…</p>;
  }

  const { application, server, git } = detail;
  const behind = git?.behind ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Meta label="Application" value={application.name} />
        <Meta label="Server" value={server?.name ?? "—"} />
        <Meta label="Environment" value={server?.environment ?? "—"} />
        <Meta label="Repository" value={application.repositoryUrl ?? "—"} />
        <Meta label="Provider" value={application.provider ?? "—"} />
        <Meta label="Branch" value={application.branch} />
        <Meta label="Project path" value={application.projectPath ?? "Not configured"} />
        <Meta label="Runtime" value={application.runtime ?? "—"} />
        <Meta label="Technology" value={application.technology ?? "—"} />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
          Current deployment
        </p>
        {git?.lastError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{git.lastError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Meta label="Local" value={<code>{shortSha(git?.localCommit)}</code>} />
          <Meta label="Remote" value={<code>{shortSha(git?.remoteCommit)}</code>} />
          <Meta
            label="Delta"
            value={
              git
                ? behind > 0
                  ? `${behind} commit${behind === 1 ? "" : "s"} behind`
                  : git.ahead > 0
                    ? `${git.ahead} ahead`
                    : "Up to date"
                : "Not checked"
            }
          />
        </div>
        {git?.dirty && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            Working tree has uncommitted changes.
          </p>
        )}
        {git?.stale && (
          <p className="text-xs text-slate-500 mb-3">
            Git status cache is stale. Refresh to compare with origin.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onPress={onViewChanges} isDisabled={busy}>
            View Changes
          </Button>
          {!readOnly && (
            <>
              <Button size="sm" variant="secondary" onPress={onRefresh} isDisabled={busy}>
                Fetch
              </Button>
              <Button size="sm" variant="secondary" onPress={onSync} isDisabled={busy}>
                Sync
              </Button>
              <Button
                size="sm"
                variant="primary"
                onPress={onDeploy}
                isDisabled={busy || !application.projectPath || Boolean(detail.activeDeployment)}
              >
                Deploy
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-3">{application.runtimeSummary}</p>
      </div>

      {changes && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">Incoming commits</p>
          {changes.incoming.length === 0 ? (
            <p className="text-sm text-slate-500">No incoming commits.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {changes.incoming.map((c) => (
                <li key={c.sha} className="font-mono text-xs">
                  <span className="text-blue-600 dark:text-blue-400">{c.sha}</span>{" "}
                  <span className="text-slate-700 dark:text-slate-300">{c.subject}</span>
                  <span className="text-slate-500"> — {c.author}</span>
                </li>
              ))}
            </ul>
          )}
          {changes.changedFiles.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                Changed files
              </p>
              <ul className="text-xs font-mono text-slate-600 dark:text-slate-400 max-h-40 overflow-auto">
                {changes.changedFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Last deployment</p>
          {detail.lastDeployment ? (
            <div className="flex items-center gap-2 text-sm">
              <StatusBadge
                status={detail.lastDeployment.status}
                variant={deploymentStatusVariant(detail.lastDeployment.status)}
              />
              <span>#{detail.lastDeployment.sequence}</span>
              <span className="text-slate-500">
                {formatDuration(detail.lastDeployment.durationMs)}
              </span>
              <span className="text-slate-500">
                {formatTimestamp(detail.lastDeployment.createdAt)}
              </span>
              <Button size="sm" variant="ghost" onPress={onViewLastLogs}>
                View logs
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No deployments yet</p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Domains</p>
          {detail.domains.length === 0 ? (
            <p className="text-sm text-slate-500">None linked</p>
          ) : (
            <ul className="text-sm">
              {detail.domains.map((d) => (
                <li key={d.id}>{d.hostname}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(detail.pm2Processes.length > 0 || detail.iisSites.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {detail.pm2Processes.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">PM2</p>
              {detail.pm2Processes.map((p) => (
                <p key={p.id}>
                  {p.name} — {p.status ?? "unknown"}
                  {p.port ? ` :${p.port}` : ""}
                </p>
              ))}
            </div>
          )}
          {detail.iisSites.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">IIS</p>
              {detail.iisSites.map((s) => (
                <p key={s.id}>
                  {s.name} — {s.state ?? "unknown"}
                  {s.appPool ? ` (${s.appPool})` : ""}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
