import { execPm2 } from "@/lib/shell/exec";
import type { Pm2ProcessDiscovery } from "./types";

interface Pm2JsonProcess {
  name: string;
  pid?: number;
  pm2_env?: {
    status?: string;
    pm_uptime?: number;
    restart_time?: number;
    pm_exec_path?: string;
    env?: Record<string, string | number>;
  };
}

function formatUptime(pmUptime?: number): string | null {
  if (!pmUptime) return null;
  const ms = Date.now() - pmUptime;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function extractPort(env?: Record<string, string | number>): number | null {
  if (!env?.PORT) return null;
  const port = parseInt(String(env.PORT), 10);
  return Number.isNaN(port) ? null : port;
}

export async function discoverPm2Processes(): Promise<Pm2ProcessDiscovery[]> {
  const output = await execPm2(["jlist"]);
  const processes = JSON.parse(output) as Pm2JsonProcess[];

  return processes.map((proc) => ({
    name: proc.name,
    status: proc.pm2_env?.status ?? "unknown",
    port: extractPort(proc.pm2_env?.env),
    pid: proc.pid ?? null,
    uptime: formatUptime(proc.pm2_env?.pm_uptime),
    restarts: proc.pm2_env?.restart_time ?? 0,
    ecosystemPath: proc.pm2_env?.pm_exec_path ?? null,
  }));
}
