import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import type { SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@/lib/db/types";
import { detectGitProvider, shortSha } from "@/lib/deployments/commands";
import { maskSecrets } from "@/lib/deployments/mask";
import {
  assertDeployPermission,
  assertSyncPermission,
  gitHealthLabel,
  validateDeployTarget,
} from "@/lib/deployments/validation";
import {
  normalizeRuntime,
  runtimeActionSummary,
} from "@/lib/deployments/workflows";
import {
  checkLocalPort,
  executeWorkflow,
} from "@/lib/deployments/executor";
import {
  compareWithRemote,
  pullFastForward,
  GitError,
} from "@/lib/git/service";
import { pm2Reload } from "@/lib/pm2/service";
import { recycleAppPool, restartIisSite } from "@/lib/iis/service";

const GIT_CACHE_TTL_MS = 15 * 60 * 1000;

export type DeploymentListFilters = {
  applicationId?: string;
  serverId?: string;
  userId?: string;
  status?: string;
  branch?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function startOfDay(isoDate: string): Date {
  const d = new Date(`${isoDate}T00:00:00`);
  return d;
}

function endOfDay(isoDate: string): Date {
  const d = new Date(`${isoDate}T23:59:59.999`);
  return d;
}

export async function getCurrentServer() {
  return prisma.server.findFirst({
    where: { isCurrent: true, active: true },
    orderBy: { updatedAt: "desc" },
  });
}

async function loadApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      deploymentType: true,
      technology: true,
      client: true,
      domains: { select: { id: true, hostname: true, sslEnabled: true, targetPort: true } },
      ports: { select: { id: true, number: true, status: true } },
      pm2Processes: { select: { id: true, name: true, status: true, port: true } },
      iisSites: {
        select: { id: true, name: true, state: true, appPool: true, physicalPath: true },
      },
      gitStatus: true,
    },
  });
}

async function upsertGitStatus(
  applicationId: string,
  data: {
    branch: string;
    localCommit: string | null;
    remoteCommit: string | null;
    ahead: number;
    behind: number;
    dirty: boolean;
    provider: string | null;
    lastError: string | null;
  }
) {
  return prisma.gitRepositoryStatus.upsert({
    where: { applicationId },
    create: { applicationId, ...data, lastFetchedAt: new Date() },
    update: { ...data, lastFetchedAt: new Date() },
  });
}

export async function refreshApplicationGitStatus(applicationId: string, role: UserRole) {
  assertSyncPermission(role);
  const app = validateDeployTarget(await loadApplication(applicationId));
  const branch = app.branch?.trim() || "main";
  const provider = detectGitProvider(app.repositoryUrl);

  try {
    const compare = await compareWithRemote(app.projectPath!, branch, {
      fetchFirst: true,
      remoteUrl: app.repositoryUrl,
    });
    const status = await upsertGitStatus(applicationId, {
      branch: compare.branch,
      localCommit: compare.localCommit,
      remoteCommit: compare.remoteCommit,
      ahead: compare.ahead,
      behind: compare.behind,
      dirty: compare.dirty,
      provider,
      lastError: null,
    });
    return { status, compare };
  } catch (err) {
    const message = maskSecrets(err instanceof Error ? err.message : "Git status failed");
    const status = await upsertGitStatus(applicationId, {
      branch,
      localCommit: null,
      remoteCommit: null,
      ahead: 0,
      behind: 0,
      dirty: false,
      provider,
      lastError: message,
    });
    if (err instanceof GitError) {
      throw new Error(message);
    }
    throw new Error(message);
  }
}

export async function syncApplicationRepository(applicationId: string, role: UserRole) {
  assertSyncPermission(role);
  const app = validateDeployTarget(await loadApplication(applicationId));
  const branch = app.branch?.trim() || "main";
  const provider = detectGitProvider(app.repositoryUrl);

  const pull = await pullFastForward(app.projectPath!, branch, {
    remoteUrl: app.repositoryUrl,
  });
  if (!pull.ok) {
    const message = maskSecrets(pull.stderr || pull.stdout || "git pull failed");
    await upsertGitStatus(applicationId, {
      branch,
      localCommit: null,
      remoteCommit: null,
      ahead: 0,
      behind: 0,
      dirty: false,
      provider,
      lastError: message,
    });
    throw new Error(message);
  }

  const compare = await compareWithRemote(app.projectPath!, branch, {
    fetchFirst: false,
    remoteUrl: app.repositoryUrl,
  });
  const status = await upsertGitStatus(applicationId, {
    branch: compare.branch,
    localCommit: compare.localCommit,
    remoteCommit: compare.remoteCommit,
    ahead: compare.ahead,
    behind: compare.behind,
    dirty: compare.dirty,
    provider,
    lastError: null,
  });

  await writeAuditLog({
    action: "SYNC",
    module: "deployments",
    entityId: applicationId,
    after: {
      branch,
      localCommit: compare.localCommit,
      remoteCommit: compare.remoteCommit,
    },
  });

  return { status, compare, output: maskSecrets(pull.stdout || "Already up to date.") };
}

export async function refreshAllGitStatuses(role: UserRole) {
  assertSyncPermission(role);
  const apps = await prisma.application.findMany({
    where: {
      projectPath: { not: null },
      status: { not: "ARCHIVED" },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: { id: string; name: string; ok: boolean; error?: string }[] = [];
  const concurrency = 3;
  for (let i = 0; i < apps.length; i += concurrency) {
    const batch = apps.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((app) => refreshApplicationGitStatus(app.id, role))
    );
    settled.forEach((result, idx) => {
      const app = batch[idx];
      if (result.status === "fulfilled") {
        results.push({ id: app.id, name: app.name, ok: true });
      } else {
        results.push({
          id: app.id,
          name: app.name,
          ok: false,
          error: result.reason instanceof Error ? result.reason.message : "Failed",
        });
      }
    });
  }
  return results;
}

export async function getApplicationDeploymentDetail(applicationId: string) {
  const [app, currentServer, lastDeployment, activeDeployment] = await Promise.all([
    loadApplication(applicationId),
    getCurrentServer(),
    prisma.deployment.findFirst({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deployment.findFirst({
      where: { applicationId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!app) return null;

  const branch = app.branch?.trim() || "main";
  const runtime = app.deploymentType?.name ?? null;

  return {
    application: {
      id: app.id,
      name: app.name,
      status: app.status,
      repositoryUrl: app.repositoryUrl,
      provider: app.gitStatus?.provider ?? detectGitProvider(app.repositoryUrl),
      branch,
      projectPath: app.projectPath,
      buildCommand: app.buildCommand,
      startCommand: app.startCommand,
      technology: app.technology?.name ?? null,
      runtime,
      runtimeSummary: runtimeActionSummary(normalizeRuntime(runtime)),
    },
    server: currentServer
      ? {
          id: currentServer.id,
          name: currentServer.name,
          hostname: currentServer.hostname,
          environment: currentServer.environment,
        }
      : null,
    git: app.gitStatus
      ? {
          localCommit: app.gitStatus.localCommit,
          remoteCommit: app.gitStatus.remoteCommit,
          ahead: app.gitStatus.ahead,
          behind: app.gitStatus.behind,
          dirty: app.gitStatus.dirty,
          lastFetchedAt: app.gitStatus.lastFetchedAt,
          lastError: app.gitStatus.lastError,
          stale:
            !app.gitStatus.lastFetchedAt ||
            Date.now() - app.gitStatus.lastFetchedAt.getTime() > GIT_CACHE_TTL_MS,
        }
      : null,
    domains: app.domains,
    ports: app.ports,
    pm2Processes: app.pm2Processes,
    iisSites: app.iisSites,
    lastDeployment,
    activeDeployment,
  };
}

export async function getApplicationChanges(applicationId: string, role: UserRole) {
  assertSyncPermission(role);
  const app = validateDeployTarget(await loadApplication(applicationId));
  const branch = app.branch?.trim() || "main";
  const compare = await compareWithRemote(app.projectPath!, branch, {
    fetchFirst: true,
    remoteUrl: app.repositoryUrl,
  });
  await upsertGitStatus(applicationId, {
    branch: compare.branch,
    localCommit: compare.localCommit,
    remoteCommit: compare.remoteCommit,
    ahead: compare.ahead,
    behind: compare.behind,
    dirty: compare.dirty,
    provider: detectGitProvider(app.repositoryUrl),
    lastError: null,
  });
  return compare;
}

export async function getDeploymentDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentServer, deploymentTypes, applications, todayCount, successToday, failedToday, recent] =
    await Promise.all([
      getCurrentServer(),
      prisma.deploymentType.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.application.findMany({
        include: {
          deploymentType: true,
          technology: true,
          gitStatus: true,
          pm2Processes: { select: { id: true, name: true, status: true } },
          iisSites: { select: { id: true, name: true, state: true } },
          deployments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, createdAt: true, sequence: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.deployment.count({ where: { createdAt: { gte: today } } }),
      prisma.deployment.count({ where: { createdAt: { gte: today }, status: "SUCCESS" } }),
      prisma.deployment.count({
        where: { createdAt: { gte: today }, status: "FAILED" },
      }),
      prisma.deployment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const runningIds = new Set(
    (
      await prisma.deployment.findMany({
        where: { status: { in: ["QUEUED", "RUNNING"] } },
        select: { applicationId: true },
      })
    )
      .map((d) => d.applicationId)
      .filter((id): id is string => Boolean(id))
  );

  const rows = applications.map((app) => {
    const git = app.gitStatus;
    const last = app.deployments[0] ?? null;
    const health = gitHealthLabel({
      lastError: git?.lastError,
      behind: git?.behind,
      localCommit: git?.localCommit,
      deploying: runningIds.has(app.id),
      lastStatus: last?.status ?? null,
    });
    return {
      id: app.id,
      name: app.name,
      status: app.status,
      serverName: currentServer?.name ?? "—",
      environment: currentServer?.environment ?? null,
      runtime: app.deploymentType?.name ?? null,
      technology: app.technology?.name ?? null,
      repositoryUrl: app.repositoryUrl,
      provider: git?.provider ?? detectGitProvider(app.repositoryUrl),
      branch: app.branch ?? "main",
      projectPath: app.projectPath,
      git: git
        ? {
            localCommit: git.localCommit,
            remoteCommit: git.remoteCommit,
            ahead: git.ahead,
            behind: git.behind,
            lastError: git.lastError,
            lastFetchedAt: git.lastFetchedAt,
          }
        : null,
      health,
      lastDeployment: last,
      deploying: runningIds.has(app.id),
    };
  });

  const updatesAvailable = rows.filter((r) => (r.git?.behind ?? 0) > 0).length;

  return {
    server: currentServer,
    stats: {
      totalApplications: applications.length,
      updatesAvailable,
      deploymentsToday: todayCount,
      successfulToday: successToday,
      failedToday: failedToday,
    },
    deploymentTypes,
    applications: rows,
    recent,
  };
}

export async function listDeployments(filters: DeploymentListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const createdAt =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: startOfDay(filters.from) } : {}),
          ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
        }
      : undefined;

  const STATUSES = new Set(["QUEUED", "RUNNING", "SUCCESS", "FAILED", "CANCELLED"]);
  const statusFilter =
    filters.status && STATUSES.has(filters.status) ? filters.status : undefined;

  const where = {
    ...(filters.applicationId ? { applicationId: filters.applicationId } : {}),
    ...(filters.serverId ? { serverId: filters.serverId } : {}),
    ...(filters.userId ? { triggeredById: filters.userId } : {}),
    ...(statusFilter ? { status: statusFilter as "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" } : {}),
    ...(filters.branch
      ? { branch: { equals: filters.branch, mode: "insensitive" as const } }
      : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.deployment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.deployment.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getDeploymentFilterOptions() {
  const [applications, servers, users, statuses] = await Promise.all([
    prisma.application.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.server.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    }),
    prisma.deployment.findMany({
      distinct: ["status"],
      select: { status: true },
    }),
  ]);

  return {
    applications,
    servers,
    users: users.map((u) => ({ id: u.id, name: u.username })),
    statuses: statuses.map((s) => s.status),
  };
}

export async function getDeployment(id: string) {
  return prisma.deployment.findUnique({ where: { id } });
}

async function appendLog(id: string, line: string) {
  const masked = maskSecrets(line.endsWith("\n") ? line : `${line}\n`);
  const current = await prisma.deployment.findUnique({
    where: { id },
    select: { log: true },
  });
  if (!current) return;
  await prisma.deployment.update({
    where: { id },
    data: { log: `${current.log}${masked}` },
  });
}

export async function prepareDeploy(applicationId: string, user: SessionUser) {
  assertDeployPermission(user.role);
  const app = validateDeployTarget(await loadApplication(applicationId));
  const currentServer = await getCurrentServer();
  const branch = app.branch?.trim() || "main";

  const existing = await prisma.deployment.findFirst({
    where: { applicationId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (existing) {
    throw new Error(`A deployment is already ${existing.status.toLowerCase()} for ${app.name}`);
  }

  let behind = app.gitStatus?.behind ?? 0;
  let localCommit = app.gitStatus?.localCommit ?? null;
  let remoteCommit = app.gitStatus?.remoteCommit ?? null;
  let gitWarning: string | null = null;

  try {
    const refreshed = await refreshApplicationGitStatus(applicationId, user.role);
    behind = refreshed.compare.behind;
    localCommit = refreshed.compare.localCommit;
    remoteCommit = refreshed.compare.remoteCommit;
  } catch (err) {
    gitWarning = err instanceof Error ? err.message : "Could not refresh git status";
  }

  return {
    application: app.name,
    applicationId: app.id,
    server: currentServer?.name ?? "—",
    environment: currentServer?.environment ?? null,
    branch,
    currentCommit: localCommit,
    targetCommit: remoteCommit,
    behind,
    runtime: app.deploymentType?.name ?? "—",
    action: runtimeActionSummary(normalizeRuntime(app.deploymentType?.name)),
    gitWarning,
  };
}

export async function queueDeployment(applicationId: string, user: SessionUser) {
  assertDeployPermission(user.role);
  const app = validateDeployTarget(await loadApplication(applicationId));
  const currentServer = await getCurrentServer();
  const branch = app.branch?.trim() || "main";

  const existing = await prisma.deployment.findFirst({
    where: { applicationId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (existing) {
    throw new Error(`A deployment is already ${existing.status.toLowerCase()} for ${app.name}`);
  }

  const git = app.gitStatus;
  const deployment = await prisma.deployment.create({
    data: {
      applicationId: app.id,
      applicationName: app.name,
      serverId: currentServer?.id ?? null,
      serverName: currentServer?.name ?? null,
      triggeredById: user.id,
      triggeredByUsername: user.username,
      status: "QUEUED",
      trigger: "MANUAL",
      branch,
      commitBefore: git?.localCommit ?? null,
      runtime: app.deploymentType?.name ?? null,
      currentStage: "Queued",
    },
  });

  await writeAuditLog({
    action: "QUEUE",
    module: "deployments",
    entityId: deployment.id,
    after: {
      applicationId,
      applicationName: app.name,
      branch,
      commitBefore: git?.localCommit ?? null,
      commitAfter: git?.remoteCommit ?? null,
    },
  });

  return {
    deployment,
    preview: {
      application: app.name,
      server: currentServer?.name ?? "—",
      environment: currentServer?.environment ?? null,
      branch,
      currentCommit: shortSha(git?.localCommit),
      targetCommit: shortSha(git?.remoteCommit),
      behind: git?.behind ?? 0,
      runtime: app.deploymentType?.name ?? "—",
      action: runtimeActionSummary(normalizeRuntime(app.deploymentType?.name)),
    },
  };
}

export async function requestCancelDeployment(id: string, user: SessionUser) {
  assertDeployPermission(user.role);
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) throw new Error("Deployment not found");
  if (deployment.status === "QUEUED") {
    await prisma.deployment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelRequested: true,
        completedAt: new Date(),
        currentStage: "Cancelled",
        error: "Cancelled before start",
      },
    });
    await appendLog(id, "Deployment cancelled before start.");
    await writeAuditLog({ action: "CANCEL", module: "deployments", entityId: id });
    return;
  }
  if (deployment.status !== "RUNNING") {
    throw new Error("Only queued or running deployments can be cancelled");
  }
  await prisma.deployment.update({
    where: { id },
    data: { cancelRequested: true },
  });
  await appendLog(id, "Cancel requested — will stop after the current stage.");
  await writeAuditLog({ action: "CANCEL", module: "deployments", entityId: id });
}

export async function runQueuedDeployment(deploymentId: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } });
  if (!deployment || deployment.status !== "QUEUED") return;
  if (deployment.cancelRequested) {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        currentStage: "Cancelled",
      },
    });
    return;
  }

  const startedAt = new Date();
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: "RUNNING", startedAt, currentStage: "Starting" },
  });
  await appendLog(deploymentId, `Deployment #${deployment.sequence}`);
  await appendLog(deploymentId, `Application: ${deployment.applicationName}`);
  await appendLog(deploymentId, `Server: ${deployment.serverName ?? "—"}`);
  await appendLog(deploymentId, `Branch: ${deployment.branch ?? "—"}`);
  await appendLog(deploymentId, "");

  if (!deployment.applicationId) {
    await failDeployment(deploymentId, startedAt, "Validate", "Application is missing", 1);
    return;
  }

  const app = await loadApplication(deployment.applicationId);
  if (!app?.projectPath) {
    await failDeployment(
      deploymentId,
      startedAt,
      "Validate",
      "Application has no project path configured",
      1
    );
    return;
  }

  const healthPort =
    app.ports.find((p) => p.status === "IN_USE")?.number ??
    app.pm2Processes.find((p) => p.port)?.port ??
    null;

  const result = await executeWorkflow({
    projectPath: app.projectPath,
    branch: deployment.branch || app.branch || "main",
    buildCommand: app.buildCommand,
    runtime: normalizeRuntime(app.deploymentType?.name),
    pm2Names: app.pm2Processes.map((p) => p.name),
    iisSites: app.iisSites.map((s) => ({ name: s.name, appPool: s.appPool })),
    healthPort,
    remoteUrl: app.repositoryUrl,
    hooks: {
      reloadPm2: pm2Reload,
      recycleIis: async (site) => {
        if (site.appPool) await recycleAppPool(site.appPool);
        else await restartIisSite(site.name);
      },
      healthCheck: checkLocalPort,
    },
    shouldCancel: async () => {
      const row = await prisma.deployment.findUnique({
        where: { id: deploymentId },
        select: { cancelRequested: true },
      });
      return Boolean(row?.cancelRequested);
    },
    onStage: async (stage) => {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { currentStage: stage },
      });
    },
    log: async (line) => {
      if (line) await appendLog(deploymentId, line);
    },
  });

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  if (!result.ok && (result.cancelled || result.error === "Deployment cancelled")) {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "CANCELLED",
        completedAt,
        durationMs,
        currentStage: "Cancelled",
        commitBefore: result.commitBefore,
        commitAfter: result.commitAfter,
        error: result.error,
        exitCode: result.exitCode,
      },
    });
    return;
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: result.ok ? "SUCCESS" : "FAILED",
      completedAt,
      durationMs,
      currentStage: result.ok ? "Completed" : result.failedStage,
      failedStage: result.failedStage,
      commitBefore: result.commitBefore,
      commitAfter: result.commitAfter,
      error: result.error,
      exitCode: result.exitCode,
    },
  });

  if (app.id) {
    try {
      await refreshApplicationGitStatus(app.id, "ADMINISTRATOR");
    } catch {
      // cache refresh is best-effort after deploy
    }
  }

  await writeAuditLog({
    action: result.ok ? "SUCCESS" : "FAILED",
    module: "deployments",
    entityId: deploymentId,
    after: {
      commitBefore: result.commitBefore,
      commitAfter: result.commitAfter,
      failedStage: result.failedStage,
      exitCode: result.exitCode,
    },
  });
}

async function failDeployment(
  id: string,
  startedAt: Date,
  stage: string,
  error: string,
  exitCode: number
) {
  const completedAt = new Date();
  await appendLog(id, `Deployment failed`);
  await appendLog(id, `Stage: ${stage}`);
  await appendLog(id, error);
  await prisma.deployment.update({
    where: { id },
    data: {
      status: "FAILED",
      failedStage: stage,
      currentStage: stage,
      error: maskSecrets(error),
      exitCode,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    },
  });
}
