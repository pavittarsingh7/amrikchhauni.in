const UNSAFE_META = /[|&;<>`$(){}]/;

export type ParsedCommand = {
  command: string;
  args: string[];
};

export class UnsafeCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeCommandError";
  }
}

function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }

  if (quote) {
    throw new UnsafeCommandError("Unclosed quote in configured command");
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Parse an application-configured command into argv.
 * Sequential `&&` is allowed as multiple steps. Shell metacharacters are rejected.
 * The frontend never supplies this string — it comes from the application record.
 */
export function parseConfiguredCommand(raw: string): ParsedCommand[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const segments = trimmed.split(/\s*&&\s*/);
  const steps: ParsedCommand[] = [];

  for (const segment of segments) {
    const part = segment.trim();
    if (!part) continue;
    if (UNSAFE_META.test(part)) {
      throw new UnsafeCommandError(
        `Configured command contains unsafe shell characters: ${part}`
      );
    }
    const tokens = tokenize(part);
    if (tokens.length === 0) continue;
    const [command, ...args] = tokens;
    if (!command) {
      throw new UnsafeCommandError("Configured command is empty");
    }
    steps.push({ command, args });
  }

  return steps;
}

export function shortSha(sha: string | null | undefined, length = 7): string {
  if (!sha) return "—";
  return sha.slice(0, length);
}

export function detectGitProvider(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.toLowerCase();
  if (value.includes("github.com") || value.includes("github.")) return "GitHub";
  if (value.includes("gitlab")) return "GitLab";
  if (value.includes("bitbucket")) return "Bitbucket";
  if (value.includes("dev.azure.com") || value.includes("visualstudio.com")) {
    return "Azure DevOps";
  }
  return "Git";
}

export function parseRevListCounts(output: string): { ahead: number; behind: number } {
  const line = output.trim().split(/\r?\n/)[0] ?? "";
  const [aheadRaw, behindRaw] = line.split(/\s+/);
  const ahead = Number.parseInt(aheadRaw ?? "0", 10);
  const behind = Number.parseInt(behindRaw ?? "0", 10);
  return {
    ahead: Number.isFinite(ahead) ? ahead : 0,
    behind: Number.isFinite(behind) ? behind : 0,
  };
}
