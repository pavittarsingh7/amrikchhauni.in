"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { RefreshCw, Rocket } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { FormSelect } from "@/components/crud/form-fields";
import {
  cancelDeploymentAction,
  deployApplicationAction,
  getApplicationChangesAction,
  getApplicationDeploymentDetailAction,
  getDeploymentDetailAction,
  prepareDeployAction,
  refreshAllGitStatusAction,
  refreshGitStatusAction,
  syncRepositoryAction,
} from "@/actions/deployments";
import { ApplicationDeployPanel } from "@/components/deployments/application-deploy-panel";
import {
  DeployConfirmDialog,
  type DeployPreview,
} from "@/components/deployments/deploy-confirm-dialog";
import {
  DeploymentLogsDialog,
  type DeploymentLogRow,
} from "@/components/deployments/deployment-logs-dialog";
import {
  deploymentStatusVariant,
  formatDuration,
  formatTimestamp,
  gitLabel,
  shortSha,
} from "@/lib/deployments/format";

type DeploymentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { applications: number };
};

type ApplicationRow = {
  id: string;
  name: string;
  status: string;
  serverName: string;
  environment: string | null;
  runtime: string | null;
  technology: string | null;
  repositoryUrl: string | null;
  provider: string | null;
  branch: string;
  projectPath: string | null;
  git: {
    localCommit: string | null;
    remoteCommit: string | null;
    ahead: number;
    behind: number;
    lastError: string | null;
    lastFetchedAt: Date | string | null;
  } | null;
  health: string;
  lastDeployment: { id: string; status: string; createdAt: Date | string; sequence: number } | null;
  deploying: boolean;
};

type DeploymentRow = {
  id: string;
  sequence: number;
  applicationName: string;
  applicationId: string | null;
  serverName: string | null;
  serverId: string | null;
  triggeredByUsername: string | null;
  triggeredById: string | null;
  branch: string | null;
  commitAfter: string | null;
  status: string;
  trigger: string;
  startedAt: Date | string | null;
  durationMs: number | null;
  createdAt: Date | string;
};

interface DeploymentsManagerProps {
  deploymentTypes: DeploymentTypeRow[];
  applications: ApplicationRow[];
  recent: DeploymentRow[];
  history: DeploymentRow[];
  historyTotal: number;
  historyPage: number;
  historyTotalPages: number;
  filterOptions: {
    applications: { id: string; name: string }[];
    servers: { id: string; name: string }[];
    users: { id: string; name: string }[];
    statuses: string[];
  };
  currentFilters: {
    applicationId: string;
    serverId: string;
    userId: string;
    status: string;
    branch: string;
    from: string;
    to: string;
  };
  serverName: string | null;
  environment: string | null;
  readOnly?: boolean;
}

export function DeploymentsManager({
  deploymentTypes,
  applications,
  recent,
  history,
  historyTotal,
  historyPage,
  historyTotalPages,
  filterOptions,
  currentFilters,
  serverName,
  environment,
  readOnly = false,
}: DeploymentsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [runtimeFilter, setRuntimeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [repoFilter, setRepoFilter] = useState("");

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appDetail, setAppDetail] = useState<Awaited<
    ReturnType<typeof getApplicationDeploymentDetailAction>
  > | null>(null);
  const [changes, setChanges] = useState<{
    incoming: { sha: string; subject: string; author: string }[];
    changedFiles: string[];
  } | null>(null);

  const [preview, setPreview] = useState<DeployPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<DeploymentLogRow | null>(null);

  const [histApp, setHistApp] = useState(currentFilters.applicationId);
  const [histServer, setHistServer] = useState(currentFilters.serverId);
  const [histUser, setHistUser] = useState(currentFilters.userId);
  const [histStatus, setHistStatus] = useState(currentFilters.status);
  const [histBranch, setHistBranch] = useState(currentFilters.branch);
  const [histFrom, setHistFrom] = useState(currentFilters.from);
  const [histTo, setHistTo] = useState(currentFilters.to);

  const runtimes = useMemo(
    () => Array.from(new Set(applications.map((a) => a.runtime).filter(Boolean))) as string[],
    [applications]
  );
  const servers = useMemo(
    () => Array.from(new Set(applications.map((a) => a.serverName).filter(Boolean))),
    [applications]
  );
  const envs = useMemo(
    () => Array.from(new Set(applications.map((a) => a.environment).filter(Boolean))) as string[],
    [applications]
  );

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (q && !app.name.toLowerCase().includes(q) && !(app.repositoryUrl ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (serverFilter && app.serverName !== serverFilter) return false;
      if (envFilter && app.environment !== envFilter) return false;
      if (runtimeFilter && app.runtime !== runtimeFilter) return false;
      if (statusFilter && app.health !== statusFilter) return false;
      if (repoFilter === "linked" && !app.repositoryUrl) return false;
      if (repoFilter === "missing" && app.repositoryUrl) return false;
      return true;
    });
  }, [applications, search, serverFilter, envFilter, runtimeFilter, statusFilter, repoFilter]);

  useEffect(() => {
    if (!activeDeployment || !logsOpen) return;
    const live =
      activeDeployment.status === "QUEUED" || activeDeployment.status === "RUNNING";
    if (!live) return;

    const timer = setInterval(() => {
      void (async () => {
        const next = await getDeploymentDetailAction(activeDeployment.id);
        if (next) {
          setActiveDeployment(next as DeploymentLogRow);
          if (next.status !== "QUEUED" && next.status !== "RUNNING") {
            router.refresh();
          }
        }
      })();
    }, 2000);

    return () => clearInterval(timer);
  }, [activeDeployment?.id, activeDeployment?.status, logsOpen, router]);

  function showMessage(text: string | null) {
    setMessage(text);
  }

  function openApp(id: string) {
    setSelectedAppId(id);
    setChanges(null);
    startTransition(async () => {
      const detail = await getApplicationDeploymentDetailAction(id);
      setAppDetail(detail);
    });
  }

  function refreshDetail(id: string) {
    startTransition(async () => {
      const detail = await getApplicationDeploymentDetailAction(id);
      setAppDetail(detail);
      router.refresh();
    });
  }

  function handleRefreshAll() {
    startTransition(async () => {
      const result = await refreshAllGitStatusAction();
      showMessage(result.error ?? result.output ?? "Refreshed");
      router.refresh();
    });
  }

  function handleFetch(applicationId: string) {
    startTransition(async () => {
      const result = await refreshGitStatusAction(applicationId);
      showMessage(result.error ?? "Git status updated");
      refreshDetail(applicationId);
    });
  }

  function handleSync(applicationId: string) {
    startTransition(async () => {
      const result = await syncRepositoryAction(applicationId);
      showMessage(result.error ?? result.output ?? "Synced");
      refreshDetail(applicationId);
    });
  }

  function handleViewChanges(applicationId: string) {
    startTransition(async () => {
      try {
        const compare = await getApplicationChangesAction(applicationId);
        setChanges({ incoming: compare.incoming, changedFiles: compare.changedFiles });
        const detail = await getApplicationDeploymentDetailAction(applicationId);
        setAppDetail(detail);
      } catch (err) {
        showMessage(err instanceof Error ? err.message : "Failed to load changes");
      }
    });
  }

  function handlePrepareDeploy(applicationId: string) {
    startTransition(async () => {
      const result = await prepareDeployAction(applicationId);
      if (!result.success) {
        showMessage(result.error ?? "Cannot deploy");
        return;
      }
      setPreview(result.preview);
      setConfirmOpen(true);
    });
  }

  function handleConfirmDeploy() {
    if (!preview) return;
    startTransition(async () => {
      const result = await deployApplicationAction(preview.applicationId);
      setConfirmOpen(false);
      if (result.error || !result.id) {
        showMessage(result.error ?? "Deploy failed to start");
        return;
      }
      const deployment = await getDeploymentDetailAction(result.id);
      setActiveDeployment(deployment as DeploymentLogRow);
      setLogsOpen(true);
      if (selectedAppId) refreshDetail(selectedAppId);
      else router.refresh();
    });
  }

  function handleOpenLogs(id: string) {
    startTransition(async () => {
      const deployment = await getDeploymentDetailAction(id);
      setActiveDeployment(deployment as DeploymentLogRow);
      setLogsOpen(true);
    });
  }

  function handleCancel() {
    if (!activeDeployment) return;
    startTransition(async () => {
      await cancelDeploymentAction(activeDeployment.id);
      const deployment = await getDeploymentDetailAction(activeDeployment.id);
      setActiveDeployment(deployment as DeploymentLogRow);
      router.refresh();
    });
  }

  function applyHistoryFilters(page = 1) {
    const params = new URLSearchParams();
    if (histApp) params.set("applicationId", histApp);
    if (histServer) params.set("serverId", histServer);
    if (histUser) params.set("userId", histUser);
    if (histStatus) params.set("status", histStatus);
    if (histBranch) params.set("branch", histBranch);
    if (histFrom) params.set("from", histFrom);
    if (histTo) params.set("to", histTo);
    if (page > 1) params.set("page", String(page));
    router.push(`/deployments?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className="text-sm bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {serverName ? (
            <>
              Operating on <span className="font-medium text-slate-700 dark:text-slate-200">{serverName}</span>
              {environment ? ` · ${environment}` : ""}
            </>
          ) : (
            "No current server registered"
          )}
        </p>
        {!readOnly && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            isDisabled={isPending}
            onPress={handleRefreshAll}
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
            Refresh git status
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="acdm-table">
          <thead>
            <tr className="acdm-table-head">
              <th className="acdm-table-head-cell">Type</th>
              {deploymentTypes.map((type) => (
                <th key={type.id} className="acdm-table-head-cell">
                  {type.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="acdm-table-row">
              <td className="acdm-table-cell text-slate-500">Applications</td>
              {deploymentTypes.map((type) => (
                <td key={type.id} className="acdm-table-cell">
                  {type._count.applications}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {deploymentTypes.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">No deployment types</p>
        )}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Applications</h2>
          <p className="text-sm text-slate-500">
            Known applications and cached repository state. Git history is not loaded until you fetch or open an app.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <TextField name="search" value={search} onChange={setSearch} className="w-56">
            <Label>Search applications</Label>
            <Input placeholder="Search applications..." />
          </TextField>
          <div className="w-40">
            <FormSelect
              label="Server"
              name="server"
              value={serverFilter}
              onChange={setServerFilter}
              options={servers.map((s) => ({ id: s, name: s }))}
              placeholder="All servers"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="Environment"
              name="environment"
              value={envFilter}
              onChange={setEnvFilter}
              options={envs.map((s) => ({ id: s, name: s }))}
              placeholder="All environments"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="Runtime"
              name="runtime"
              value={runtimeFilter}
              onChange={setRuntimeFilter}
              options={runtimes.map((s) => ({ id: s, name: s }))}
              placeholder="All runtimes"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="Status"
              name="health"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["Healthy", "Update", "Error", "Running", "Unknown"].map((s) => ({
                id: s,
                name: s,
              }))}
              placeholder="All statuses"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="Repository"
              name="repo"
              value={repoFilter}
              onChange={setRepoFilter}
              options={[
                { id: "linked", name: "Has repository" },
                { id: "missing", name: "No repository" },
              ]}
              placeholder="All repos"
            />
          </div>
        </div>

        <DataTable
          keyField="id"
          data={filteredApps}
          emptyMessage="No applications match the current filters"
          columns={[
            {
              key: "name",
              header: "Application",
              render: (row) => (
                <button
                  type="button"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  onClick={() => openApp(row.id)}
                >
                  {row.name}
                </button>
              ),
            },
            { key: "serverName", header: "Server" },
            {
              key: "git",
              header: "Git",
              render: (row) => gitLabel(row.git?.behind, Boolean(row.git)),
            },
            {
              key: "health",
              header: "Status",
              render: (row) => (
                <StatusBadge status={row.health} variant={deploymentStatusVariant(row.health)} />
              ),
            },
            {
              key: "action",
              header: "Action",
              render: (row) => {
                if (readOnly || !row.projectPath) return "—";
                if (row.deploying) return <StatusBadge status="Running" variant="warning" />;
                if ((row.git?.behind ?? 0) > 0 || row.health === "Error") {
                  return (
                    <Button
                      size="sm"
                      variant="primary"
                      className="gap-1"
                      isDisabled={isPending}
                      onPress={() => handlePrepareDeploy(row.id)}
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Deploy
                    </Button>
                  );
                }
                return "—";
              },
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Deployments</h2>
        <DataTable
          keyField="id"
          data={recent}
          emptyMessage="No deployments yet"
          columns={[
            { key: "applicationName", header: "Application" },
            { key: "serverName", header: "Server", render: (r) => r.serverName ?? "—" },
            { key: "branch", header: "Branch", render: (r) => r.branch ?? "—" },
            {
              key: "commitAfter",
              header: "Commit",
              render: (r) => <code>{shortSha(r.commitAfter)}</code>,
            },
            {
              key: "startedAt",
              header: "Started",
              render: (r) => formatTimestamp(r.startedAt ?? r.createdAt),
            },
            {
              key: "durationMs",
              header: "Duration",
              render: (r) => formatDuration(r.durationMs),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <StatusBadge status={r.status} variant={deploymentStatusVariant(r.status)} />
              ),
            },
            {
              key: "logs",
              header: "",
              render: (r) => (
                <Button size="sm" variant="ghost" onPress={() => handleOpenLogs(r.id)}>
                  View logs
                </Button>
              ),
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Deployment History</h2>
          <p className="text-sm text-slate-500">{historyTotal} recorded runs</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-44">
            <FormSelect
              label="Application"
              name="histApp"
              value={histApp}
              onChange={setHistApp}
              options={filterOptions.applications}
              placeholder="All applications"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="Server"
              name="histServer"
              value={histServer}
              onChange={setHistServer}
              options={filterOptions.servers}
              placeholder="All servers"
            />
          </div>
          <div className="w-40">
            <FormSelect
              label="User"
              name="histUser"
              value={histUser}
              onChange={setHistUser}
              options={filterOptions.users}
              placeholder="All users"
            />
          </div>
          <div className="w-36">
            <FormSelect
              label="Status"
              name="histStatus"
              value={histStatus}
              onChange={setHistStatus}
              options={["QUEUED", "RUNNING", "SUCCESS", "FAILED", "CANCELLED"].map((s) => ({
                id: s,
                name: s,
              }))}
              placeholder="All statuses"
            />
          </div>
          <TextField name="branch" value={histBranch} onChange={setHistBranch} className="w-36">
            <Label>Branch</Label>
            <Input />
          </TextField>
          <TextField name="from" value={histFrom} onChange={setHistFrom} className="w-40">
            <Label>From</Label>
            <Input type="date" />
          </TextField>
          <TextField name="to" value={histTo} onChange={setHistTo} className="w-40">
            <Label>To</Label>
            <Input type="date" />
          </TextField>
          <Button variant="secondary" size="sm" onPress={() => applyHistoryFilters(1)}>
            Filter
          </Button>
        </div>

        <DataTable
          keyField="id"
          data={history}
          emptyMessage="No deployment history matches these filters"
          columns={[
            {
              key: "sequence",
              header: "#",
              render: (r) => <span className="font-mono text-xs">#{r.sequence}</span>,
            },
            { key: "applicationName", header: "Application" },
            { key: "serverName", header: "Server", render: (r) => r.serverName ?? "—" },
            { key: "triggeredByUsername", header: "User", render: (r) => r.triggeredByUsername ?? "—" },
            { key: "branch", header: "Branch", render: (r) => r.branch ?? "—" },
            {
              key: "commitAfter",
              header: "Commit",
              render: (r) => <code>{shortSha(r.commitAfter)}</code>,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <StatusBadge status={r.status} variant={deploymentStatusVariant(r.status)} />
              ),
            },
            {
              key: "startedAt",
              header: "Started",
              render: (r) => formatTimestamp(r.startedAt ?? r.createdAt),
            },
            {
              key: "durationMs",
              header: "Duration",
              render: (r) => formatDuration(r.durationMs),
            },
            { key: "trigger", header: "Trigger" },
            {
              key: "logs",
              header: "",
              render: (r) => (
                <Button size="sm" variant="ghost" onPress={() => handleOpenLogs(r.id)}>
                  View logs
                </Button>
              ),
            },
          ]}
        />

        {historyTotalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {historyPage} of {historyTotalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                isDisabled={historyPage <= 1}
                onPress={() => applyHistoryFilters(historyPage - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={historyPage >= historyTotalPages}
                onPress={() => applyHistoryFilters(historyPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      <Modal.Backdrop
        isOpen={!!selectedAppId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAppId(null);
            setAppDetail(null);
            setChanges(null);
          }
        }}
        variant="opaque"
      >
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="acdm-card text-slate-900 dark:text-slate-100 w-full max-w-4xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="acdm-card-title">
                {appDetail?.application.name ?? "Application"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ApplicationDeployPanel
                detail={appDetail}
                changes={changes}
                readOnly={readOnly}
                busy={isPending}
                onRefresh={() => selectedAppId && handleFetch(selectedAppId)}
                onSync={() => selectedAppId && handleSync(selectedAppId)}
                onDeploy={() => selectedAppId && handlePrepareDeploy(selectedAppId)}
                onViewChanges={() => selectedAppId && handleViewChanges(selectedAppId)}
                onViewLastLogs={() => {
                  if (appDetail?.lastDeployment) handleOpenLogs(appDetail.lastDeployment.id);
                }}
              />
            </Modal.Body>
            <Modal.Footer className="flex gap-2 justify-end">
              <Button variant="ghost" slot="close">
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <DeployConfirmDialog
        isOpen={confirmOpen}
        preview={preview}
        isLoading={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDeploy}
      />

      <DeploymentLogsDialog
        isOpen={logsOpen}
        deployment={activeDeployment}
        onClose={() => {
          setLogsOpen(false);
          setActiveDeployment(null);
          router.refresh();
        }}
        onCancel={handleCancel}
        canCancel={!readOnly}
      />
    </div>
  );
}
