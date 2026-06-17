import fs from "fs/promises";
import path from "path";
import type { ApplicationDiscovery } from "./types";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "bin",
  "obj",
  ".vs",
  "venv",
  "__pycache__",
  "coverage",
]);

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(dir: string): Promise<PackageJson | null> {
  try {
    const raw = await fs.readFile(path.join(dir, "package.json"), "utf-8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

async function detectTechnology(
  dir: string,
  pkg: PackageJson | null
): Promise<{ technology: string; deploymentType: string }> {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };

  if (deps?.next) return { technology: "Next.js", deploymentType: "PM2" };
  if (deps?.["@angular/core"]) return { technology: "Angular", deploymentType: "IIS" };
  if (deps?.react) return { technology: "React", deploymentType: "PM2" };

  if (await fileExists(path.join(dir, "angular.json"))) {
    return { technology: "Angular", deploymentType: "IIS" };
  }

  const entries = await fs.readdir(dir);
  if (entries.some((f) => f.endsWith(".csproj"))) {
    return { technology: "ASP.NET", deploymentType: "IIS" };
  }

  if (
    (await fileExists(path.join(dir, "requirements.txt"))) ||
    (await fileExists(path.join(dir, "pyproject.toml"))) ||
    entries.some((f) => f.endsWith(".py") && f !== "setup.py")
  ) {
    return { technology: "Python", deploymentType: "PYTHON" };
  }

  if (pkg) return { technology: "Node.js", deploymentType: "PM2" };

  if (await fileExists(path.join(dir, "index.html"))) {
    return { technology: "Static HTML", deploymentType: "STATIC" };
  }

  return { technology: "Unknown", deploymentType: "PM2" };
}

async function scanProjectDir(
  projectPath: string,
  source: string
): Promise<ApplicationDiscovery | null> {
  const dirName = path.basename(projectPath);
  const pkg = await readPackageJson(projectPath);
  const { technology, deploymentType } = await detectTechnology(projectPath, pkg);

  if (technology === "Unknown" && !pkg) {
    const entries = await fs.readdir(projectPath);
    const hasCsproj = entries.some((f) => f.endsWith(".csproj"));
    const hasRequirements = entries.includes("requirements.txt");
    const hasIndex = entries.includes("index.html");
    if (!hasCsproj && !hasRequirements && !hasIndex) return null;
  }

  let repositoryUrl: string | null = null;
  try {
    const gitConfig = await fs.readFile(path.join(projectPath, ".git", "config"), "utf-8");
    const urlMatch = gitConfig.match(/url\s*=\s*(.+)/);
    if (urlMatch) repositoryUrl = urlMatch[1].trim();
  } catch {
    // no git remote
  }

  return {
    name: pkg?.name ?? dirName,
    projectPath,
    source,
    technology,
    deploymentType,
    hasPackageJson: !!pkg,
    hasEcosystemConfig: await fileExists(path.join(projectPath, "ecosystem.config.js")),
    repositoryUrl,
  };
}

export async function discoverApplications(
  roots: string[]
): Promise<ApplicationDiscovery[]> {
  const results: ApplicationDiscovery[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    let entries;
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;

      const projectPath = path.join(root, entry.name);
      const normalized = projectPath.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const discovered = await scanProjectDir(projectPath, root);
      if (discovered) results.push(discovered);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
