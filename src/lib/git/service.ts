import fs from "fs/promises";
import path from "path";
import { execCommandCapture, type ExecCaptureResult } from "@/lib/shell/exec";
import { parseRevListCounts } from "@/lib/deployments/commands";
import { maskSecrets } from "@/lib/deployments/mask";

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
  options?: { cwd?: string; timeout?: number }
) => Promise<ExecCaptureResult>;

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

export async function gitExec(
  projectPath: string,
  args: string[],
  options: { timeout?: number; exec?: GitExecFn } = {}
): Promise<ExecCaptureResult> {
  assertSafeGitArgs(args);
  if (!options.exec) {
    await assertGitRepository(projectPath);
  }
  const exec = options.exec ?? execCommandCapture;
  const result = await exec("git", args, {
    cwd: projectPath,
    timeout: options.timeout ?? 120_000,
  });
  return {
    ...result,
    stdout: maskSecrets(result.stdout),
    stderr: maskSecrets(result.stderr),
  };
}

async function gitText(
  projectPath: string,
  args: string[],
  options?: { timeout?: number; exec?: GitExecFn }
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
  options?: { exec?: GitExecFn }
): Promise<ExecCaptureResult> {
  return gitExec(projectPath, ["fetch", "origin", "--prune"], {
    timeout: 120_000,
    exec: options?.exec,
  });
}

export async function getLocalHead(
  projectPath: string,
  options?: { exec?: GitExecFn }
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
  options?: { exec?: GitExecFn }
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
  options?: { exec?: GitExecFn; fetchFirst?: boolean }
): Promise<GitCompareResult> {
  if (!options?.exec) {
    await assertGitRepository(projectPath);
  }
  const exec = options?.exec;

  if (options?.fetchFirst !== false) {
    const fetchResult = await fetchRemote(projectPath, { exec });
    if (!fetchResult.ok) {
      throw new GitError(
        fetchResult.stderr.trim() || "git fetch failed",
        fetchResult.exitCode
      );
    }
  }

  const localCommit = await getLocalHead(projectPath, { exec });
  const remoteCommit = await getRemoteHead(projectPath, branch, { exec });

  let ahead = 0;
  let behind = 0;
  if (localCommit && remoteCommit) {
    const counts = await gitText(
      projectPath,
      ["rev-list", "--left-right", "--count", `HEAD...origin/${branch}`],
      { exec }
    );
    const parsed = parseRevListCounts(counts);
    ahead = parsed.ahead;
    behind = parsed.behind;
  }

  let dirty = false;
  try {
    const status = await gitText(projectPath, ["status", "--porcelain"], { exec });
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
      await gitText(projectPath, [...logFormat, "-n", "12", "HEAD"], { exec })
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
          { exec }
        )
      );
    } catch {
      incoming = [];
    }
    try {
      const diff = await gitText(
        projectPath,
        ["diff", "--name-only", `HEAD...origin/${branch}`],
        { exec }
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
  options?: { exec?: GitExecFn }
): Promise<ExecCaptureResult> {
  await fetchRemote(projectPath, options);
  return gitExec(projectPath, ["pull", "--ff-only", "origin", branch], {
    timeout: 180_000,
    exec: options?.exec,
  });
}
