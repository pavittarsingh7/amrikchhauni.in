import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

interface SpawnTarget {
  command: string;
  args: string[];
}

/**
 * On Windows, npm global binaries (pm2, etc.) are .cmd shims that cannot be
 * spawned directly with execFile — they must run through cmd.exe.
 */
function resolveSpawnTarget(command: string, args: string[]): SpawnTarget {
  if (process.platform !== "win32") {
    return { command, args };
  }

  const ext = path.extname(command).toLowerCase();
  if (ext === ".exe" || ext === ".com") {
    return { command, args };
  }

  const comspec = process.env.ComSpec ?? "cmd.exe";
  return {
    command: comspec,
    args: ["/d", "/s", "/c", command, ...args],
  };
}

function formatExecError(
  command: string,
  args: string[],
  err: { code?: string | number; message?: string; stdout?: Buffer; stderr?: Buffer }
): string {
  const stdout = err.stdout?.toString().trim() ?? "";
  const stderr = err.stderr?.toString().trim() ?? "";
  const detail = stderr || stdout || err.message || "Command failed";
  const label = [command, ...args].join(" ");
  return err.code ? `${detail} (${label}, code ${err.code})` : `${detail} (${label})`;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<ExecResult> {
  const { cwd, timeout = 60_000 } = options;
  const target = resolveSpawnTarget(command, args);

  try {
    const { stdout, stderr } = await execFileAsync(target.command, target.args, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    });
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  } catch (err: unknown) {
    const error = err as {
      code?: string | number;
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    throw new Error(formatExecError(command, args, error));
  }
}

export async function execPowerShell(script: string): Promise<string> {
  const { stdout } = await execCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { timeout: 120_000 }
  );
  return stdout.trim();
}

export async function execPm2(args: string[]): Promise<string> {
  const { stdout } = await execCommand("pm2", args, { timeout: 30_000 });
  return stdout.trim();
}

export async function execNginx(
  args: string[],
  nginxRoot: string
): Promise<ExecResult> {
  const root = nginxRoot.replace(/[/\\]+$/, "");
  const nginxExe = path.join(root, "nginx.exe");
  const prefix = `${root}\\`;
  return execCommand(nginxExe, [...args, "-p", prefix], { timeout: 30_000 });
}
