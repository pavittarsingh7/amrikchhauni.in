const URL_CREDENTIALS = /(https?:\/\/)([^:@\s]+):([^@\s]+)@/gi;
const GITHUB_PAT = /ghp_[A-Za-z0-9_]{20,}/g;
const GITHUB_FINE_GRAINED = /github_pat_[A-Za-z0-9_]{20,}/g;
const GITLAB_PAT = /glpat-[A-Za-z0-9_-]{20,}/g;
const AZURE_PAT = /(?<=:)[a-zA-Z0-9_-]{20,}(?=@)/g;
const BEARER = /(Bearer\s+)\S+/gi;
const AUTHORIZATION = /(Authorization:\s*)\S+/gi;
const KEY_VALUE_SECRET =
  /((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)\s*[=:]\s*)["']?[^\s"'\\]+["']?/gi;
const PRIVATE_KEY =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const NPM_TOKEN = /npm_[A-Za-z0-9]{20,}/g;

export function maskSecrets(text: string): string {
  if (!text) return text;
  return text
    .replace(URL_CREDENTIALS, "$1***:***@")
    .replace(GITHUB_PAT, "ghp_***")
    .replace(GITHUB_FINE_GRAINED, "github_pat_***")
    .replace(GITLAB_PAT, "glpat-***")
    .replace(NPM_TOKEN, "npm_***")
    .replace(BEARER, "$1***")
    .replace(AUTHORIZATION, "$1***")
    .replace(KEY_VALUE_SECRET, "$1***")
    .replace(PRIVATE_KEY, "[REDACTED PRIVATE KEY]")
    .replace(AZURE_PAT, "***");
}
