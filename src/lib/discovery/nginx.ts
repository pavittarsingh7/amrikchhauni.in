import fs from "fs/promises";
import path from "path";
import type { NginxSiteDiscovery } from "./types";

function extractServerNames(content: string): string[] {
  const match = content.match(/server_name\s+([^;]+);/);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .filter((n) => n && n !== "_");
}

function extractPrimaryHostname(names: string[]): string {
  return names.find((n) => !n.startsWith("www.")) ?? names[0] ?? "";
}

function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  return parts[0];
}

function extractProxyPass(content: string): {
  proxyPass: string | null;
  targetPort: number | null;
} {
  const match = content.match(/proxy_pass\s+https?:\/\/([^;]+);/);
  if (!match) return { proxyPass: null, targetPort: null };

  const proxyPass = match[1].trim();
  const portMatch = proxyPass.match(/:(\d+)/);
  const targetPort = portMatch ? parseInt(portMatch[1], 10) : null;

  return {
    proxyPass: proxyPass.startsWith("http") ? proxyPass : `http://${proxyPass}`,
    targetPort,
  };
}

function extractRootPath(content: string): string | null {
  const match = content.match(/^\s*root\s+([^;]+);/m);
  return match ? match[1].trim().replace(/\/$/, "") : null;
}

export async function discoverNginxSites(
  sitesPath: string
): Promise<NginxSiteDiscovery[]> {
  const results: NginxSiteDiscovery[] = [];

  let files: string[];
  try {
    files = await fs.readdir(sitesPath);
  } catch {
    throw new Error(`Cannot read nginx sites directory: ${sitesPath}`);
  }

  for (const file of files.filter((f) => f.endsWith(".conf"))) {
    const filepath = path.join(sitesPath, file);
    try {
      const content = await fs.readFile(filepath, "utf-8");
      const names = extractServerNames(content);
      if (names.length === 0) continue;

      const hostname = extractPrimaryHostname(names);
      const sslEnabled = /listen\s+443\s+ssl/.test(content);
      const { proxyPass, targetPort } = extractProxyPass(content);
      const rootPath = extractRootPath(content);

      results.push({
        filename: file,
        filepath,
        hostname,
        subdomain: extractSubdomain(hostname),
        sslEnabled,
        proxyPass,
        rootPath,
        targetPort,
        content,
      });
    } catch {
      // skip unreadable configs
    }
  }

  return results;
}
