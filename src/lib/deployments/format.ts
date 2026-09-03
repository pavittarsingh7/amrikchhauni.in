export function shortSha(sha: string | null | undefined, length = 7): string {
  if (!sha) return "—";
  return sha.slice(0, length);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function formatTimestamp(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function gitLabel(behind: number | null | undefined, hasCache: boolean): string {
  if (!hasCache) return "Not checked";
  if ((behind ?? 0) > 0) return `${behind} behind`;
  return "Up to date";
}

export function deploymentStatusVariant(
  status: string
): "success" | "warning" | "error" | "default" {
  const value = status.toLowerCase();
  if (value === "success" || value === "healthy") return "success";
  if (value === "failed" || value === "error" || value === "cancelled") return "error";
  if (value === "queued" || value === "running" || value === "update") return "warning";
  return "default";
}
