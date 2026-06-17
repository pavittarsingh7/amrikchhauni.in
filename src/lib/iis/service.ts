import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { execPowerShell } from "@/lib/shell/exec";
import { persistIisDiscovery } from "@/lib/discovery/persist";

export async function listIisSites() {
  return prisma.iisSite.findMany({
    include: { application: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

async function refreshDiscovery() {
  try {
    await persistIisDiscovery();
  } catch {
    // non-fatal
  }
}

async function runIisAction(script: string, siteName: string, action: string) {
  await execPowerShell(script);
  await writeAuditLog({
    action: action.toUpperCase(),
    module: "iis",
    entityId: siteName,
  });
  await refreshDiscovery();
}

export async function startIisSite(name: string) {
  await runIisAction(
    `Import-Module WebAdministration; Start-IISSite -Name '${name.replace(/'/g, "''")}'`,
    name,
    "START"
  );
}

export async function stopIisSite(name: string) {
  await runIisAction(
    `Import-Module WebAdministration; Stop-IISSite -Name '${name.replace(/'/g, "''")}' -Confirm:$false`,
    name,
    "STOP"
  );
}

export async function restartIisSite(name: string) {
  const safe = name.replace(/'/g, "''");
  await runIisAction(
    `Import-Module WebAdministration; Stop-IISSite -Name '${safe}' -Confirm:$false; Start-IISSite -Name '${safe}'`,
    name,
    "RESTART"
  );
}

export async function startAppPool(poolName: string) {
  const safe = poolName.replace(/'/g, "''");
  await runIisAction(
    `Import-Module WebAdministration; Start-WebAppPool -Name '${safe}'`,
    poolName,
    "START_POOL"
  );
}

export async function stopAppPool(poolName: string) {
  const safe = poolName.replace(/'/g, "''");
  await runIisAction(
    `Import-Module WebAdministration; Stop-WebAppPool -Name '${safe}'`,
    poolName,
    "STOP_POOL"
  );
}

export async function recycleAppPool(poolName: string) {
  const safe = poolName.replace(/'/g, "''");
  await runIisAction(
    `Import-Module WebAdministration; Restart-WebAppPool -Name '${safe}'`,
    poolName,
    "RECYCLE_POOL"
  );
}

export async function linkIisToApplication(
  siteId: string,
  applicationId: string | null
) {
  const before = await prisma.iisSite.findUnique({ where: { id: siteId } });
  if (!before) throw new Error("Site not found");

  const after = await prisma.iisSite.update({
    where: { id: siteId },
    data: { applicationId },
  });

  await writeAuditLog({
    action: "LINK",
    module: "iis",
    entityId: siteId,
    before: { applicationId: before.applicationId },
    after: { applicationId },
  });

  return after;
}
