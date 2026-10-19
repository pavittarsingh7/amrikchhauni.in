import { getSetting, ensureDefaultSettings } from "@/lib/settings/service";

export type GitAuthMode = "none" | "https_token";

export type GitHttpsCredentials = {
  mode: "https_token";
  username: string;
  token: string;
};

export type GitAuthConfig =
  | { mode: "none" }
  | GitHttpsCredentials;

export function buildBasicAuthHeader(username: string, token: string): string {
  const encoded = Buffer.from(`${username}:${token}`, "utf8").toString("base64");
  return `AUTHORIZATION: basic ${encoded}`;
}

export function isHttpsRemoteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function isSshRemoteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = url.trim();
  return /^git@/i.test(value) || /^ssh:\/\//i.test(value);
}

/**
 * Resolve server-wide Git credentials from Settings.
 * Tokens stay in the DB/settings secret field — never in remotes or frontend payloads.
 */
export async function getGitAuthConfig(): Promise<GitAuthConfig> {
  await ensureDefaultSettings();

  const mode = ((await getSetting("git.auth_mode")) ?? "none").trim().toLowerCase();
  if (mode !== "https_token") {
    return { mode: "none" };
  }

  const username = ((await getSetting("git.https_username")) ?? "x-access-token").trim();
  const token = ((await getSetting("git.https_token")) ?? "").trim();

  if (!token) {
    throw new Error(
      "Git auth mode is https_token but git.https_token is empty. Set a Personal Access Token in Settings → Git."
    );
  }

  return {
    mode: "https_token",
    username: username || "x-access-token",
    token,
  };
}

/**
 * Build process env for non-interactive authenticated HTTPS Git.
 * Uses GIT_CONFIG_* so credentials never appear on the argv allowlist path.
 */
export function buildGitAuthEnv(
  auth: GitAuthConfig,
  remoteUrl?: string | null
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "never",
  };

  if (auth.mode !== "https_token") {
    return env;
  }

  // SSH remotes use machine keys — do not inject HTTPS headers.
  if (remoteUrl && isSshRemoteUrl(remoteUrl)) {
    return env;
  }

  // If we know the remote and it is not HTTPS, skip token injection.
  if (remoteUrl && !isHttpsRemoteUrl(remoteUrl) && !isSshRemoteUrl(remoteUrl)) {
    return env;
  }

  env.GIT_CONFIG_COUNT = "1";
  env.GIT_CONFIG_KEY_0 = "http.extraHeader";
  env.GIT_CONFIG_VALUE_0 = buildBasicAuthHeader(auth.username, auth.token);

  return env;
}

export function explainGitRemoteFailure(
  stderr: string,
  options?: { hasTokenConfigured?: boolean; remoteUrl?: string | null }
): string {
  const text = stderr.trim();
  const lower = text.toLowerCase();
  const authHints =
    lower.includes("authentication failed") ||
    lower.includes("could not read username") ||
    lower.includes("terminal prompts disabled") ||
    lower.includes("invalid credentials") ||
    lower.includes("access denied") ||
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("permission denied") ||
    lower.includes("repository not found");

  if (!authHints) {
    return text || "git command failed";
  }

  if (options?.remoteUrl && isSshRemoteUrl(options.remoteUrl)) {
    return (
      `${text || "Git authentication failed"}. ` +
      "This looks like an SSH remote. Ensure the Windows account running ACDM/PM2 has an SSH key loaded for the host, or switch the remote to HTTPS and configure Settings → Git with a PAT."
    );
  }

  if (!options?.hasTokenConfigured) {
    return (
      `${text || "Git authentication failed"}. ` +
      "Private HTTPS repositories need a Personal Access Token. Set Settings → Git → Auth Mode = https_token and paste a PAT into HTTPS Token (Super Admin)."
    );
  }

  return (
    `${text || "Git authentication failed"}. ` +
    "The configured PAT was rejected. Check token scopes (repo/read), expiry, and that git.https_username matches the provider (GitHub: x-access-token, GitLab: oauth2 or your username)."
  );
}
