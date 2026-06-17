import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { execPowerShell } from "@/lib/shell/exec";

const SYNC_SCRIPT = `
$services = Get-Service | ForEach-Object {
  @{
    name = $_.Name
    displayName = $_.DisplayName
    status = [string]$_.Status
    startType = $_.StartType.ToString()
  }
}
$services | ConvertTo-Json -Compress
`.trim();

export async function syncWindowsServices() {
  const output = await execPowerShell(SYNC_SCRIPT);
  if (!output) return [];

  const parsed = JSON.parse(output) as
    | Array<{
        name: string;
        displayName: string;
        status: string;
        startType: string;
      }>
    | {
        name: string;
        displayName: string;
        status: string;
        startType: string;
      };

  const services = Array.isArray(parsed) ? parsed : [parsed];

  for (const svc of services) {
    const existing = await prisma.windowsService.findUnique({
      where: { name: svc.name },
    });

    await prisma.windowsService.upsert({
      where: { name: svc.name },
      update: {
        displayName: svc.displayName,
        status: svc.status,
        startType: svc.startType,
      },
      create: {
        name: svc.name,
        displayName: svc.displayName,
        status: svc.status,
        startType: svc.startType,
        whitelisted: false,
      },
    });
  }

  return prisma.windowsService.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listWindowsServices() {
  return prisma.windowsService.findMany({
    orderBy: [{ whitelisted: "desc" }, { name: "asc" }],
  });
}

async function assertWhitelisted(serviceName: string) {
  const svc = await prisma.windowsService.findUnique({
    where: { name: serviceName },
  });
  if (!svc?.whitelisted) {
    throw new Error(`Service "${serviceName}" is not whitelisted for management`);
  }
  return svc;
}

export async function startWindowsService(name: string) {
  await assertWhitelisted(name);
  const safe = name.replace(/'/g, "''");
  await execPowerShell(`Start-Service -Name '${safe}' -ErrorAction Stop`);
  await writeAuditLog({ action: "START", module: "services", entityId: name });
  await syncWindowsServices();
}

export async function stopWindowsService(name: string) {
  await assertWhitelisted(name);
  const safe = name.replace(/'/g, "''");
  await execPowerShell(`Stop-Service -Name '${safe}' -Force -ErrorAction Stop`);
  await writeAuditLog({ action: "STOP", module: "services", entityId: name });
  await syncWindowsServices();
}

export async function restartWindowsService(name: string) {
  await assertWhitelisted(name);
  const safe = name.replace(/'/g, "''");
  await execPowerShell(
    `Restart-Service -Name '${safe}' -Force -ErrorAction Stop`
  );
  await writeAuditLog({ action: "RESTART", module: "services", entityId: name });
  await syncWindowsServices();
}

export async function setServiceWhitelist(name: string, whitelisted: boolean) {
  const svc = await prisma.windowsService.update({
    where: { name },
    data: { whitelisted },
  });
  await writeAuditLog({
    action: whitelisted ? "WHITELIST" : "UNWHITELIST",
    module: "services",
    entityId: name,
  });
  return svc;
}
