import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { assertMutableNginxPath } from "@/lib/nginx/immutable-paths";
import { getPathSetting } from "@/lib/settings/service";
import { execNginx, execPowerShell } from "@/lib/shell/exec";

export interface NginxConfigInput {
  filename: string;
  content: string;
  domain?: string;
  enabled?: boolean;
}

async function getNginxPaths() {
  const [nginxRoot, sitesPath, backupsPath] = await Promise.all([
    getPathSetting("paths.nginx_root"),
    getPathSetting("paths.nginx_sites"),
    getPathSetting("paths.backups"),
  ]);
  return {
    nginxRoot,
    sitesPath,
    backupDir: path.join(backupsPath, "nginx"),
  };
}

export async function testNginxConfig(): Promise<{
  passed: boolean;
  output: string;
}> {
  const { nginxRoot } = await getNginxPaths();
  try {
    const result = await execNginx(["-t"], nginxRoot);
    return {
      passed: true,
      output: result.stdout || result.stderr || "Configuration test successful",
    };
  } catch (err) {
    return {
      passed: false,
      output: err instanceof Error ? err.message : "Configuration test failed",
    };
  }
}

export async function reloadNginx(): Promise<string> {
  const { nginxRoot } = await getNginxPaths();
  const result = await execNginx(["-s", "reload"], nginxRoot);
  await writeAuditLog({ action: "RELOAD", module: "nginx" });
  return result.stdout || "Nginx reloaded successfully";
}

export async function restartNginxService(): Promise<string> {
  const serviceName = await getPathSetting("service.nginx_name");
  const output = await execPowerShell(
    `Restart-Service -Name '${serviceName}' -Force -ErrorAction Stop; Write-Output 'Service restarted'`
  );
  await writeAuditLog({ action: "RESTART", module: "nginx" });
  return output;
}

async function backupConfigFile(
  configId: string,
  content: string,
  filepath: string,
  reason: string
) {
  const { backupDir } = await getNginxPaths();
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `${path.basename(filepath)}.${timestamp}.bak`;
  const backupFilepath = path.join(backupDir, backupFilename);

  await fs.writeFile(backupFilepath, content, "utf-8");

  await prisma.nginxConfigBackup.create({
    data: {
      nginxConfigId: configId,
      content,
      filepath: backupFilepath,
      reason,
    },
  });

  return backupFilepath;
}

async function writeConfigFile(filepath: string, content: string) {
  await assertMutableNginxPath(filepath);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content, "utf-8");
}

export async function listNginxConfigs() {
  return prisma.nginxConfig.findMany({
    orderBy: { domain: "asc" },
    include: { _count: { select: { backups: true } } },
  });
}

export async function getNginxConfig(id: string) {
  return prisma.nginxConfig.findUnique({
    where: { id },
    include: {
      backups: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createNginxConfig(
  input: NginxConfigInput,
  options: { autoReload?: boolean } = {}
) {
  const { sitesPath } = await getNginxPaths();
  const filename = input.filename.endsWith(".conf")
    ? input.filename
    : `${input.filename}.conf`;
  const filepath = path.join(sitesPath, filename);

  const existing = await prisma.nginxConfig.findUnique({ where: { filename } });
  if (existing) throw new Error(`Config ${filename} already exists`);

  await writeConfigFile(filepath, input.content);

  const config = await prisma.nginxConfig.create({
    data: {
      filename,
      filepath,
      content: input.content,
      domain: input.domain ?? null,
      enabled: input.enabled ?? true,
    },
  });

  const test = await testNginxConfig();
  await prisma.nginxConfig.update({
    where: { id: config.id },
    data: { lastTested: new Date(), testPassed: test.passed },
  });

  if (!test.passed) {
    await fs.unlink(filepath).catch(() => {});
    await prisma.nginxConfig.delete({ where: { id: config.id } });
    throw new Error(`Nginx test failed — rolled back: ${test.output}`);
  }

  if (options.autoReload) await reloadNginx();

  await writeAuditLog({
    action: "CREATE",
    module: "nginx",
    entityId: config.id,
    after: { filename, domain: input.domain },
  });

  return { config, test };
}

export async function updateNginxConfig(
  id: string,
  input: { content: string; domain?: string; enabled?: boolean },
  options: { autoReload?: boolean } = {}
) {
  const before = await prisma.nginxConfig.findUnique({ where: { id } });
  if (!before) throw new Error("Config not found");

  const previousContent =
    (await fs.readFile(before.filepath, "utf-8").catch(() => null)) ??
    before.content ??
    "";

  await backupConfigFile(id, previousContent, before.filepath, "pre-update");

  await writeConfigFile(before.filepath, input.content);

  const after = await prisma.nginxConfig.update({
    where: { id },
    data: {
      content: input.content,
      domain: input.domain ?? before.domain,
      enabled: input.enabled ?? before.enabled,
    },
  });

  const test = await testNginxConfig();
  await prisma.nginxConfig.update({
    where: { id },
    data: { lastTested: new Date(), testPassed: test.passed },
  });

  if (!test.passed) {
    await writeConfigFile(before.filepath, previousContent);
    await prisma.nginxConfig.update({
      where: { id },
      data: { content: previousContent },
    });
    throw new Error(`Nginx test failed — rolled back: ${test.output}`);
  }

  if (options.autoReload) await reloadNginx();

  await writeAuditLog({
    action: "UPDATE",
    module: "nginx",
    entityId: id,
    before: { content: previousContent.slice(0, 200) },
    after: { content: input.content.slice(0, 200) },
  });

  return { config: after, test };
}

export async function deleteNginxConfig(
  id: string,
  options: { autoReload?: boolean } = {}
) {
  const before = await prisma.nginxConfig.findUnique({ where: { id } });
  if (!before) throw new Error("Config not found");

  const content =
    (await fs.readFile(before.filepath, "utf-8").catch(() => null)) ??
    before.content ??
    "";

  await backupConfigFile(id, content, before.filepath, "pre-delete");
  await fs.unlink(before.filepath).catch(() => {});
  await prisma.nginxConfig.delete({ where: { id } });

  const test = await testNginxConfig();
  if (!test.passed) {
    await writeConfigFile(before.filepath, content);
    await prisma.nginxConfig.create({
      data: {
        id: before.id,
        filename: before.filename,
        filepath: before.filepath,
        content,
        domain: before.domain,
        enabled: before.enabled,
      },
    });
    throw new Error(`Nginx test failed after delete — restored: ${test.output}`);
  }

  if (options.autoReload) await reloadNginx();

  await writeAuditLog({
    action: "DELETE",
    module: "nginx",
    entityId: id,
    before: { filename: before.filename },
  });
}

export async function restoreNginxBackup(
  backupId: string,
  options: { autoReload?: boolean } = {}
) {
  const backup = await prisma.nginxConfigBackup.findUnique({
    where: { id: backupId },
    include: { nginxConfig: true },
  });
  if (!backup) throw new Error("Backup not found");

  return updateNginxConfig(
    backup.nginxConfigId,
    {
      content: backup.content,
      domain: backup.nginxConfig.domain ?? undefined,
    },
    options
  );
}

export function generateSiteTemplate(domain: string, port: number): string {
  return `server {
    listen 443 ssl;
    server_name ${domain};

    include D:/nginx/conf/snippets/ssl-common.conf;

    location / {
        include D:/nginx/conf/snippets/proxy-common.conf;
        proxy_pass http://localhost:${port};
    }
}
`;
}
