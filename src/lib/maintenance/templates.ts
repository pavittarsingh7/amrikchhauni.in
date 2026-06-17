import path from "path";
import { getPathSetting } from "@/lib/settings/service";

export async function getMaintenanceDir(): Promise<string> {
  return getPathSetting("paths.maintenance");
}

export async function getNginxMaintenanceDir(): Promise<string> {
  const nginxConf = await getPathSetting("paths.nginx_conf");
  return path.join(nginxConf, "maintenance");
}

export async function getMaintenanceBackupDir(): Promise<string> {
  const backups = await getPathSetting("paths.backups");
  return path.join(backups, "nginx");
}

export function toNginxPath(filepath: string): string {
  return filepath.replace(/\\/g, "/");
}

/** Directives served from website-maintenance.conf inside location / */
export function buildWebsiteMaintenanceSnippet(maintenanceHtmlDir: string): string {
  const root = toNginxPath(maintenanceHtmlDir);
  return `root ${root};
index index.html;
try_files $uri $uri/ /index.html;
`;
}

/** location / block that includes the maintenance snippet file */
export function buildMaintenanceLocationBlock(
  websiteMaintenanceInclude: string
): string {
  return `location / {
    include ${toNginxPath(websiteMaintenanceInclude)};
}`;
}

/** Marker file written when server-wide maintenance is active */
export function buildGlobalMaintenanceMarker(enabled: boolean, siteCount: number): string {
  if (!enabled) {
    return `# ACDM global maintenance disabled
# This file is a status marker only — site configs are swapped individually.
`;
  }
  return `# ACDM global maintenance ENABLED
# Sites in maintenance mode: ${siteCount}
# Generated at: ${new Date().toISOString()}
`;
}

export const MAINTENANCE_LOCATION_MARKER =
  "maintenance/website-maintenance.conf";
