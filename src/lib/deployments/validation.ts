import type { UserRole } from "@/lib/db/types";
import { canWrite } from "@/lib/auth/roles";

export type DeployableApplication = {
  id: string;
  name: string;
  status: string;
  projectPath: string | null;
  branch: string | null;
  repositoryUrl: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  deploymentType: { name: string } | null;
};

export function assertDeployPermission(role: UserRole): void {
  if (!canWrite(role)) {
    throw new Error("Forbidden: Write access required");
  }
}

export function assertSyncPermission(role: UserRole): void {
  assertDeployPermission(role);
}

export function validateDeployTarget<T extends DeployableApplication>(
  app: T | null
): T {
  if (!app) {
    throw new Error("Application not found");
  }
  if (app.status === "ARCHIVED") {
    throw new Error("Cannot deploy archived applications");
  }
  if (!app.projectPath?.trim()) {
    throw new Error("Application has no project path configured");
  }
  return app;
}

export function gitHealthLabel(input: {
  lastError?: string | null;
  behind?: number | null;
  localCommit?: string | null;
  deploying?: boolean;
  lastStatus?: string | null;
}): "Running" | "Update" | "Healthy" | "Error" | "Unknown" {
  if (input.deploying) return "Running";
  if (input.lastError) return "Error";
  if (input.lastStatus === "FAILED") return "Error";
  if ((input.behind ?? 0) > 0) return "Update";
  if (input.localCommit) return "Healthy";
  return "Unknown";
}
