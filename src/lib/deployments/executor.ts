import { execCommandCapture, type ExecCaptureResult } from "@/lib/shell/exec";
import {
  compareWithRemote,
  getLocalHead,
  pullFastForward,
  GitError,
  type GitExecFn,
} from "@/lib/git/service";
import { parseConfiguredCommand, UnsafeCommandError } from "@/lib/deployments/commands";
import { maskSecrets } from "@/lib/deployments/mask";
import {
  buildWorkflow,
  normalizeRuntime,
  type RuntimeKind,
} from "@/lib/deployments/workflows";

export type RuntimeHooks = {
  reloadPm2?: (name: string) => Promise<void>;
  recycleIis?: (site: { name: string; appPool: string | null }) => Promise<void>;
  healthCheck?: (port: number) => Promise<boolean>;
};

export type WorkflowContext = {
  projectPath: string;
  branch: string;
  buildCommand: string | null;
  runtime: RuntimeKind;
  pm2Names: string[];
  iisSites: { name: string; appPool: string | null }[];
  healthPort: number | null;
  gitExec?: GitExecFn;
  commandExec?: (
    command: string,
    args: string[],
    options?: { cwd?: string; timeout?: number }
  ) => Promise<ExecCaptureResult>;
  hooks?: RuntimeHooks;
  shouldCancel?: () => Promise<boolean>;
  onStage?: (stage: string) => Promise<void>;
  log: (line: string) => Promise<void>;
};

export type WorkflowResult = {
  ok: boolean;
  cancelled?: boolean;
  commitBefore: string | null;
  commitAfter: string | null;
  failedStage: string | null;
  exitCode: number | null;
  error: string | null;
};

class CancelledError extends Error {
  stage: string;
  constructor(stage: string) {
    super("Deployment cancelled");
    this.stage = stage;
    this.name = "CancelledError";
  }
}

class StageError extends Error {
  stage: string;
  exitCode: number;
  constructor(stage: string, message: string, exitCode = 1) {
    super(message);
    this.stage = stage;
    this.exitCode = exitCode;
  }
}

function formatOutput(result: ExecCaptureResult): string {
  return maskSecrets([result.stdout, result.stderr].filter(Boolean).join("\n").trim());
}

export async function executeWorkflow(ctx: WorkflowContext): Promise<WorkflowResult> {
  const runtime = normalizeRuntime(ctx.runtime);
  const stages = buildWorkflow({
    runtime,
    hasBuildCommand: Boolean(ctx.buildCommand?.trim()),
  });

  let commitBefore: string | null = null;
  let commitAfter: string | null = null;
  let currentStage = "Starting";

  try {
    for (const stage of stages) {
      currentStage = stage.label;
      if (ctx.shouldCancel && (await ctx.shouldCancel())) {
        throw new CancelledError(stage.label);
      }
      await ctx.onStage?.(stage.label);

      if (stage.kind === "git-fetch" || stage.kind === "git-pull") {
        await ctx.log(`$ git ${stage.kind === "git-fetch" ? "fetch origin --prune" : `pull --ff-only origin ${ctx.branch}`}`);
      }

      if (stage.kind === "git-fetch") {
        const compare = await compareWithRemote(ctx.projectPath, ctx.branch, {
          exec: ctx.gitExec,
          fetchFirst: true,
        });
        commitBefore = compare.localCommit;
        await ctx.log("Fetching repository...");
        await ctx.log(
          `✓ Repository updated  local=${compare.localCommit?.slice(0, 7) ?? "—"}  remote=${compare.remoteCommit?.slice(0, 7) ?? "—"}  ${compare.behind} behind`
        );
        continue;
      }

      if (stage.kind === "git-pull") {
        const pulled = await pullFastForward(ctx.projectPath, ctx.branch, {
          exec: ctx.gitExec,
        });
        const output = formatOutput(pulled);
        if (output) await ctx.log(output);
        if (!pulled.ok) {
          throw new StageError("Pull", output || "git pull --ff-only failed", pulled.exitCode);
        }
        await ctx.log(pulled.ok ? "✓ Working tree updated (fast-forward only)" : "");
        commitAfter = await getLocalHead(ctx.projectPath, { exec: ctx.gitExec });
        continue;
      }

      if (stage.kind === "build") {
        await runBuild(ctx);
        continue;
      }

      if (stage.kind === "runtime") {
        await runRuntime(ctx, runtime);
        continue;
      }

      if (stage.kind === "health") {
        await runHealthCheck(ctx);
      }
    }

    if (!commitAfter) {
      commitAfter = await getLocalHead(ctx.projectPath, { exec: ctx.gitExec });
    }

    await ctx.log("");
    await ctx.log("Deployment successful");
    return {
      ok: true,
      commitBefore,
      commitAfter,
      failedStage: null,
      exitCode: 0,
      error: null,
    };
  } catch (err) {
    const cancelled = err instanceof CancelledError;
    const stage =
      err instanceof StageError || err instanceof CancelledError
        ? err.stage
        : currentStage;
    const exitCode =
      err instanceof StageError
        ? err.exitCode
        : err instanceof GitError
          ? err.exitCode
          : cancelled
            ? null
            : 1;
    const error = maskSecrets(err instanceof Error ? err.message : "Deployment failed");
    await ctx.log("");
    if (cancelled) {
      await ctx.log("Deployment cancelled");
      await ctx.log(`Stopped before stage: ${stage}`);
    } else {
      await ctx.log(`Deployment failed`);
      await ctx.log(`Stage: ${stage}`);
      await ctx.log(`Command exited with code ${exitCode ?? 1}.`);
      await ctx.log(error);
    }
    return {
      ok: false,
      cancelled,
      commitBefore,
      commitAfter,
      failedStage: cancelled ? null : stage,
      exitCode,
      error,
    };
  }
}

async function runBuild(ctx: WorkflowContext) {
  if (!ctx.buildCommand?.trim()) return;
  let steps;
  try {
    steps = parseConfiguredCommand(ctx.buildCommand);
  } catch (err) {
    throw new StageError(
      "Build",
      err instanceof UnsafeCommandError ? err.message : "Invalid build command",
      1
    );
  }

  const exec = ctx.commandExec ?? execCommandCapture;
  for (const step of steps) {
    await ctx.log(`$ ${step.command} ${step.args.join(" ")}`.trim());
    const result = await exec(step.command, step.args, {
      cwd: ctx.projectPath,
      timeout: 15 * 60_000,
    });
    const output = formatOutput(result);
    if (output) await ctx.log(output);
    if (!result.ok) {
      throw new StageError("Build", output || `${step.command} failed`, result.exitCode);
    }
    await ctx.log(`✓ ${step.command} completed`);
  }
}

async function runRuntime(ctx: WorkflowContext, runtime: RuntimeKind) {
  if (runtime === "PM2" || runtime === "PYTHON") {
    if (ctx.pm2Names.length === 0) {
      await ctx.log("No linked PM2 process — skipping runtime reload. Link a process in /pm2.");
      return;
    }
    for (const name of ctx.pm2Names) {
      await ctx.log(`$ pm2 reload ${name}`);
      if (!ctx.hooks?.reloadPm2) {
        throw new StageError("Runtime", "PM2 reload hook is not configured");
      }
      await ctx.hooks.reloadPm2(name);
      await ctx.log(`✓ Reloaded ${name}`);
    }
    return;
  }

  if (runtime === "IIS") {
    if (ctx.iisSites.length === 0) {
      await ctx.log("No linked IIS site — skipping runtime recycle. Link a site in /iis.");
      return;
    }
    for (const site of ctx.iisSites) {
      const label = site.appPool ? `app pool ${site.appPool}` : `site ${site.name}`;
      await ctx.log(`$ iis recycle ${label}`);
      if (!ctx.hooks?.recycleIis) {
        throw new StageError("Runtime", "IIS recycle hook is not configured");
      }
      await ctx.hooks.recycleIis(site);
      await ctx.log(`✓ Recycled ${label}`);
    }
    return;
  }

  if (runtime === "DOCKER") {
    await ctx.log(
      "Docker runtime is tracked as metadata in ACDM. Container start/restart is not executed automatically."
    );
    if (ctx.buildCommand?.trim()) {
      await ctx.log("Build/compose command already ran in the Build stage.");
    }
    return;
  }

  if (runtime === "WINDOWS_SERVICE") {
    await ctx.log(
      "Windows Service restart is not performed here. Use /services for whitelisted services."
    );
    return;
  }

  if (runtime === "STATIC") {
    await ctx.log("Static site — no process restart.");
  }
}

async function runHealthCheck(ctx: WorkflowContext) {
  if (!ctx.healthPort || !ctx.hooks?.healthCheck) {
    await ctx.log("No in-use port linked — skipping health check.");
    return;
  }

  await ctx.log(`Checking http://127.0.0.1:${ctx.healthPort} ...`);
  const attempts = 4;
  for (let i = 1; i <= attempts; i += 1) {
    const ok = await ctx.hooks.healthCheck(ctx.healthPort);
    if (ok) {
      await ctx.log("✓ Health check passed");
      return;
    }
    if (i < attempts) {
      await ctx.log(`Attempt ${i}/${attempts} failed, retrying...`);
      await sleep(2000);
    }
  }
  await ctx.log(
    `⚠ Health check did not respond on port ${ctx.healthPort}. Deployment steps completed; verify the process manually.`
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkLocalPort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}
