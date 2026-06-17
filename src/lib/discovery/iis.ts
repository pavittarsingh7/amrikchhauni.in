import { execPowerShell } from "@/lib/shell/exec";
import type { IisSiteDiscovery } from "./types";

interface IisBindingJson {
  protocol: string;
  bindingInformation: string;
  sslFlags?: number;
}

interface IisAppJson {
  path: string;
  physicalPath: string | null;
  appPool: string | null;
}

interface IisSiteJson {
  name: string;
  state: string;
  bindings: IisBindingJson[];
  applications: IisAppJson[];
}

const IIS_DISCOVERY_SCRIPT = `
$ErrorActionPreference = 'Stop'
Import-Module WebAdministration
$sites = Get-IISSite | ForEach-Object {
  $site = $_
  $bindings = @(Get-IISSiteBinding -Name $site.Name | ForEach-Object {
    @{
      protocol = $_.protocol
      bindingInformation = $_.bindingInformation
      sslFlags = [int]$_.sslFlags
    }
  })
  $apps = @($site.Applications | ForEach-Object {
    $vd = $_.VirtualDirectories | Select-Object -First 1
    @{
      path = $_.Path
      physicalPath = if ($vd) { $vd.PhysicalPath } else { $null }
      appPool = $_.ApplicationPoolName
    }
  })
  @{
    name = $site.Name
    state = [string]$site.State
    bindings = $bindings
    applications = $apps
  }
}
$sites | ConvertTo-Json -Depth 6 -Compress
`.trim();

function detectIisPattern(
  physicalPath: string | null,
  apps: IisAppJson[]
): IisSiteDiscovery["pattern"] {
  if (!physicalPath && apps.length > 0) {
    physicalPath = apps[0].physicalPath;
  }
  if (!physicalPath) return "UNKNOWN";

  const lower = physicalPath.toLowerCase();
  const hasAngular =
    lower.includes("angular") ||
    apps.some((a) => a.physicalPath?.toLowerCase().includes("angular"));
  const hasAspNet =
    lower.includes("aspnet") ||
    lower.includes(".net") ||
    lower.endsWith(".dll") ||
    apps.some((a) => a.physicalPath?.toLowerCase().includes("wwwroot"));

  if (hasAngular && hasAspNet) return "BOTH";
  if (hasAngular) return "ANGULAR_IIS";
  if (hasAspNet) return "ASPNET_IIS";

  // Check for Angular inside ASP.NET publish (wwwroot with index.html + main.js)
  const wwwrootHint = apps.some(
    (a) =>
      a.path === "/" &&
      a.physicalPath &&
      /wwwroot|publish|dist/i.test(a.physicalPath)
  );
  if (wwwrootHint) return "ANGULAR_IN_ASPNET";

  return "UNKNOWN";
}

export async function discoverIisSites(): Promise<IisSiteDiscovery[]> {
  const output = await execPowerShell(IIS_DISCOVERY_SCRIPT);
  if (!output) return [];

  const parsed = JSON.parse(output) as IisSiteJson | IisSiteJson[];
  const sites = Array.isArray(parsed) ? parsed : [parsed];

  return sites.map((site) => {
    const primaryApp = site.applications.find((a) => a.path === "/") ?? site.applications[0];

    return {
      name: site.name,
      state: site.state,
      bindings: site.bindings ?? [],
      appPool: primaryApp?.appPool ?? null,
      physicalPath: primaryApp?.physicalPath ?? null,
      pattern: detectIisPattern(primaryApp?.physicalPath ?? null, site.applications ?? []),
    };
  });
}
