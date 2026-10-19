import fs from "fs/promises";
import path from "path";
import { execCommandCapture, type ExecCaptureResult } from "@/lib/shell/exec";
import { parseRevListCounts } from "@/lib/deployments/commands";
import { maskSecrets } from "@/lib/deployments/mask";
import {
  buildGitAuthEnv,
  explainGitRemoteFailure,
  getGitAuthConfig,
  type GitAuthConfig,
} from "@/lib/git/auth";

const ALLOWED_GIT_SUBCOMMANDS = new Set([
  "fetch",
  "status",
  "rev-parse",
  "rev-list",
  "log",
  "diff",
  "pull",
  "remote",
]);

export type GitExecFn = (
  command: string,
  args: string[],
  options?: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv }
) => Promise<ExecCaptureResult>;

export type GitExecOptions = {
  timeout?: number;
  exec?: GitExecFn;
  /** When set, skip Settings lookup (tests / custom runners). */
  auth?: GitAuthConfig;
  remoteUrl?: string | null;
};

export class GitError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "GitError";
    this.exitCode = exitCode;
  }
}

function assertSafeGitArgs(args: string[]) {
  if (args.length === 0) {
    throw new GitError("Git command is empty");
  }
  const sub = args[0];
  if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
    throw new GitError(`Git subcommand not allowed: ${sub}`);
  }
}

export async function assertGitRepository(projectPath: string): Promise<void> {
  if (!projectPath?.trim()) {
    throw new GitError("Repository path is not configured");
  }
  try {
    const stat = await fs.stat(projectPath);
    if (!stat.isDirectory()) {
      throw new GitError(`Project path is not a directory: ${projectPath}`);
    }
  } catch (err) {
    if (err instanceof GitError) throw err;
    throw new GitError(`Project path does not exist: ${projectPath}`);
  }

  try {
    await fs.access(path.join(projectPath, ".git"));
  } catch {
    throw new GitError(`Not a git repository: ${projectPath}`);
  }
}

async function resolveRemoteUrl(
  projectPath: string,
  options?: GitExecOptions
): Promise<string | null> {
  if (options?.remoteUrl) return options.remoteUrl;
  if (options?.exec) return null;
  try {
    const result = await execCommandCapture(
      "git",
      ["remote", "get-url", "origin"],
      {
        cwd: projectPath,
        timeout: 15_000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      }
    );
    if (!result.ok) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}

async function resolveAuthEnv(
  projectPath: string,
  options?: GitExecOptions
): Promise<{ env: NodeJS.ProcessEnv; auth: GitAuthConfig; remoteUrl: string | null }> {
  const auth = options?.auth ?? (await getGitAuthConfig());
  const remoteUrl = await resolveRemoteUrl(projectPath, options);
  return {
    auth,
    remoteUrl,
    env: buildGitAuthEnv(auth, remoteUrl),
  };
}

export async function gitExec(
  projectPath: string,
  args: string[],
  options: GitExecOptions = {}
): Promise<ExecCaptureResult> {
  assertSafeGitArgs(args);
  if (!options.exec) {
    await assertGitRepository(projectPath);
  }

  const { env, auth, remoteUrl } = options.exec
    ? {
        env: undefined as NodeJS.ProcessEnv | undefined,
        auth: options.auth ?? ({ mode: "none" } as GitAuthConfig),
        remoteUrl: options.remoteUrl ?? null,
      }
    : await resolveAuthEnv(projectPath, options);

  const exec = options.exec ?? execCommandCapture;
  const result = await exec("git", args, {
    cwd: projectPath,
    timeout: options.timeout ?? 120_000,
    env,
  });

  if (!result.ok) {
    const explained = explainGitRemoteFailure(result.stderr || result.stdout, {
      hasTokenConfigured: auth.mode === "https_token",
      remoteUrl,
    });
    return {
      ...result,
      stdout: maskSecrets(result.stdout),
      stderr: maskSecrets(explained),
    };
  }

  return {
    ...result,
    stdout: maskSecrets(result.stdout),
    stderr: maskSecrets(result.stderr),
  };
}

async function gitText(
  projectPath: string,
  args: string[],
  options?: GitExecOptions
): Promise<string> {
  const result = await gitExec(projectPath, args, options);
  if (!result.ok) {
    const detail = (result.stderr || result.stdout || "git command failed").trim();
    throw new GitError(detail, result.exitCode);
  }
  return result.stdout.trim();
}

export type GitCommitInfo = {
  sha: string;
  subject: string;
  author: string;
  date: string;
};

export type GitCompareResult = {
  branch: string;
  localCommit: string | null;
  remoteCommit: string | null;
  ahead: number;
  behind: number;
  dirty: boolean;
  incoming: GitCommitInfo[];
  recent: GitCommitInfo[];
  changedFiles: string[];
};

function parseLog(output: string): GitCommitInfo[] {
  if (!output.trim()) return [];
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, subject, author, date] = line.split("\t");
      return {
        sha: sha ?? "",
        subject: subject ?? "",
        author: author ?? "",
        date: date ?? "",
      };
    });
}

export async function fetchRemote(
  projectPath: string,
  options?: GitExecOptions
): Promise<ExecCaptureResult> {
  return gitExec(projectPath, ["fetch", "origin", "--prune"], {
    timeout: 120_000,
    ...options,
  });
}

export async function getLocalHead(
  projectPath: string,
  options?: GitExecOptions
): Promise<string | null> {
  try {
    const sha = await gitText(projectPath, ["rev-parse", "HEAD"], options);
    return sha || null;
  } catch {
    return null;
  }
}

export async function getRemoteHead(
  projectPath: string,
  branch: string,
  options?: GitExecOptions
): Promise<string | null> {
  try {
    const sha = await gitText(
      projectPath,
      ["rev-parse", `origin/${branch}`],
      options
    );
    return sha || null;
  } catch {
    return null;
  }
}

export async function compareWithRemote(
  projectPath: string,
  branch: string,
  options?: GitExecOptions & { fetchFirst?: boolean }
): Promise<GitCompareResult> {
  if (!options?.exec) {
    await assertGitRepository(projectPath);
  }
  const exec = options?.exec;
  const shared: GitExecOptions = {
    exec,
    auth: options?.auth,
    remoteUrl: options?.remoteUrl,
  };

  if (options?.fetchFirst !== false) {
    const fetchResult = await fetchRemote(projectPath, shared);
    if (!fetchResult.ok) {
      throw new GitError(
        fetchResult.stderr.trim() || "git fetch failed",
        fetchResult.exitCode
      );
    }
  }

  const localCommit = await getLocalHead(projectPath, shared);
  const remoteCommit = await getRemoteHead(projectPath, branch, shared);

  let ahead = 0;
  let behind = 0;
  if (localCommit && remoteCommit) {
    const counts = await gitText(
      projectPath,
      ["rev-list", "--left-right", "--count", `HEAD...origin/${branch}`],
      shared
    );
    const parsed = parseRevListCounts(counts);
    ahead = parsed.ahead;
    behind = parsed.behind;
  }

  let dirty = false;
  try {
    const status = await gitText(projectPath, ["status", "--porcelain"], shared);
    dirty = status.length > 0;
  } catch {
    dirty = false;
  }

  let incoming: GitCommitInfo[] = [];
  let recent: GitCommitInfo[] = [];
  let changedFiles: string[] = [];

  const logFormat = ["log", `--format=%h\t%s\t%an\t%aI`];

  try {
    recent = parseLog(
      await gitText(projectPath, [...logFormat, "-n", "12", "HEAD"], shared)
    );
  } catch {
    recent = [];
  }

  if (remoteCommit) {
    try {
      incoming = parseLog(
        await gitText(
          projectPath,
          [...logFormat, "-n", "30", `HEAD..origin/${branch}`],
          shared
        )
      );
    } catch {
      incoming = [];
    }
    try {
      const diff = await gitText(
        projectPath,
        ["diff", "--name-only", `HEAD...origin/${branch}`],
        shared
      );
      changedFiles = diff.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    } catch {
      changedFiles = [];
    }
  }

  return {
    branch,
    localCommit,
    remoteCommit,
    ahead,
    behind,
    dirty,
    incoming,
    recent,
    changedFiles,
  };
}

export async function pullFastForward(
  projectPath: string,
  branch: string,
  options?: GitExecOptions
): Promise<ExecCaptureResult> {
  await fetchRemote(projectPath, options);
  return gitExec(projectPath, ["pull", "--ff-only", "origin", branch], {
    timeout: 180_000,
    ...options,
  });
}
