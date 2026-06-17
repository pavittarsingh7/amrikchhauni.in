import { execCommand } from "@/lib/shell/exec";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/logger";
import { getPathSetting } from "@/lib/settings/service";

export interface SslDiscoveryItem {
  winAcmeId?: string;
  domain: string;
  issuer?: string;
  subject?: string;
  thumbprint?: string;
  serialNumber?: string;
  notBefore?: Date;
  notAfter?: Date;
  storePath?: string;
  source: "win-acme" | "cert-store";
}

async function getWacsPath(): Promise<string> {
  return getPathSetting("paths.win_acme");
}

export async function discoverSslFromWinAcme(): Promise<SslDiscoveryItem[]> {
  const wacs = await getWacsPath();
  const { stdout } = await execCommand(wacs, ["--list"], { timeout: 60_000 });
  const items: SslDiscoveryItem[] = [];

  const lines = stdout.split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*(\d+):\s*\[Manual\]\s+(.+?)\s+-\s+/);
    if (!match) continue;
    const id = match[1];
    const domain = match[2].trim();
    items.push({
      winAcmeId: id,
      domain,
      subject: domain,
      source: "win-acme",
    });
  }

  return items;
}

const CERT_STORE_SCRIPT = `
$now = Get-Date
$certs = Get-ChildItem Cert:\\LocalMachine\\My -ErrorAction SilentlyContinue | ForEach-Object {
  $dns = $_.DnsNameList | ForEach-Object { $_.Unicode }
  if (-not $dns -or $dns.Count -eq 0) { $dns = @($_.Subject -replace 'CN=') }
  @{
    domain = ($dns | Select-Object -First 1)
    subject = $_.Subject
    issuer = $_.Issuer
    thumbprint = $_.Thumbprint
    serialNumber = $_.SerialNumber
    notBefore = $_.NotBefore.ToString('o')
    notAfter = $_.NotAfter.ToString('o')
    storePath = 'LocalMachine\\My'
  }
}
$certs | ConvertTo-Json -Compress
`.trim();

export async function discoverSslFromCertStore(): Promise<SslDiscoveryItem[]> {
  const { stdout } = await execCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", CERT_STORE_SCRIPT],
    { timeout: 60_000 }
  );
  if (!stdout) return [];

  const parsed = JSON.parse(stdout) as
    | Array<{
        domain: string;
        subject: string;
        issuer: string;
        thumbprint: string;
        serialNumber: string;
        notBefore: string;
        notAfter: string;
        storePath: string;
      }>
    | {
        domain: string;
        subject: string;
        issuer: string;
        thumbprint: string;
        serialNumber: string;
        notBefore: string;
        notAfter: string;
        storePath: string;
      };

  const certs = Array.isArray(parsed) ? parsed : [parsed];

  return certs.map((c) => ({
    domain: c.domain,
    subject: c.subject,
    issuer: c.issuer,
    thumbprint: c.thumbprint,
    serialNumber: c.serialNumber,
    notBefore: new Date(c.notBefore),
    notAfter: new Date(c.notAfter),
    storePath: c.storePath,
    source: "cert-store" as const,
  }));
}

export async function persistSslDiscovery(): Promise<{
  discovered: number;
  updated: number;
}> {
  const [wacsItems, storeItems] = await Promise.all([
    discoverSslFromWinAcme().catch(() => []),
    discoverSslFromCertStore().catch(() => []),
  ]);

  const merged = new Map<string, SslDiscoveryItem>();

  for (const item of storeItems) {
    merged.set(item.domain.toLowerCase(), item);
  }
  for (const item of wacsItems) {
    const key = item.domain.toLowerCase();
    const existing = merged.get(key);
    merged.set(key, { ...existing, ...item });
  }

  let updated = 0;
  for (const item of merged.values()) {
    const existing = await prisma.sslCertificate.findFirst({
      where: {
        OR: [
          { domain: item.domain },
          ...(item.thumbprint ? [{ thumbprint: item.thumbprint }] : []),
        ],
      },
    });

    if (existing) {
      await prisma.sslCertificate.update({
        where: { id: existing.id },
        data: {
          domain: item.domain,
          issuer: item.issuer,
          subject: item.subject,
          thumbprint: item.thumbprint,
          serialNumber: item.serialNumber,
          notBefore: item.notBefore,
          notAfter: item.notAfter,
          storePath: item.storePath,
          winAcmeId: item.winAcmeId,
        },
      });
      updated++;
    } else {
      await prisma.sslCertificate.create({
        data: {
          domain: item.domain,
          issuer: item.issuer,
          subject: item.subject,
          thumbprint: item.thumbprint,
          serialNumber: item.serialNumber,
          notBefore: item.notBefore,
          notAfter: item.notAfter,
          storePath: item.storePath,
          winAcmeId: item.winAcmeId,
        },
      });
    }
  }

  await writeAuditLog({
    action: "DISCOVER",
    module: "ssl",
    after: { count: merged.size },
  });

  return { discovered: merged.size, updated };
}

export async function listSslCertificates() {
  return prisma.sslCertificate.findMany({
    orderBy: { notAfter: "asc" },
  });
}

export async function renewSslCertificate(id: string): Promise<string> {
  const cert = await prisma.sslCertificate.findUnique({ where: { id } });
  if (!cert) throw new Error("Certificate not found");

  const wacs = await getWacsPath();
  if (!cert.winAcmeId) {
    throw new Error("No Win-ACME renewal ID — run discovery first");
  }

  const { stdout, stderr } = await execCommand(
    wacs,
    ["--renew", "--id", cert.winAcmeId, "--force"],
    { timeout: 300_000 }
  );

  await persistSslDiscovery();
  await writeAuditLog({
    action: "RENEW",
    module: "ssl",
    entityId: id,
    after: { domain: cert.domain },
  });

  return stdout || stderr || "Renewal completed";
}

export async function createSslCertificate(input: {
  domain: string;
  email: string;
  webroot: string;
}): Promise<string> {
  const wacs = await getWacsPath();
  const domain = input.domain.trim().toLowerCase();

  const { stdout, stderr } = await execCommand(
    wacs,
    [
      "--source",
      "manual",
      "--host",
      domain,
      "--validation",
      "filesystem",
      "--webroot",
      input.webroot,
      "--store",
      "certificatestore",
      "--certificatestore",
      "WebHosting",
      "--installation",
      "none",
      "--accepttos",
      "--emailaddress",
      input.email,
    ],
    { timeout: 300_000 }
  );

  await persistSslDiscovery();
  await writeAuditLog({
    action: "CREATE",
    module: "ssl",
    after: { domain, email: input.email },
  });

  return stdout || stderr || "Certificate request completed";
}

export function getExpiryStatus(notAfter: Date | null): "ok" | "warning" | "expired" {
  if (!notAfter) return "ok";
  const now = Date.now();
  const expiry = notAfter.getTime();
  if (expiry < now) return "expired";
  const days = (expiry - now) / (1000 * 60 * 60 * 24);
  if (days < 30) return "warning";
  return "ok";
}
