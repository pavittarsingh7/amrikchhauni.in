import path from "path";
import { writeAuditLog } from "@/lib/audit/logger";
import { getPathSetting } from "@/lib/settings/service";

const IMMUTABLE_RELATIVE_PATHS = [
  "nginx.conf",
  path.join("snippets", "proxy-common.conf"),
  path.join("snippets", "ssl-common.conf"),
] as const;

export async function getImmutableNginxPaths(): Promise<string[]> {
  const confRoot = await getPathSetting("paths.nginx_conf");
  return IMMUTABLE_RELATIVE_PATHS.map((rel) =>
    path.normalize(path.join(confRoot, rel))
  );
}

export function isImmutableNginxPath(
  filepath: string,
  confRoot: string
): boolean {
  const normalized = path.normalize(filepath).toLowerCase();
  return IMMUTABLE_RELATIVE_PATHS.some((rel) => {
    const forbidden = path.normalize(path.join(confRoot, rel)).toLowerCase();
    return normalized === forbidden;
  });
}

export async function assertMutableNginxPath(filepath: string): Promise<void> {
  const confRoot = await getPathSetting("paths.nginx_conf");

  if (!isImmutableNginxPath(filepath, confRoot)) {
    return;
  }

  const message = `Refusing to modify immutable nginx infrastructure file: ${filepath}`;

  await writeAuditLog({
    action: "BLOCKED_WRITE",
    module: "nginx",
    entityId: filepath,
    after: {
      reason: message,
      immutableFiles: await getImmutableNginxPaths(),
    },
  });

  throw new Error(message);
}
