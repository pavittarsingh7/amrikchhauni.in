"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession, requireWriteAccess } from "@/lib/auth/session";
import {
  getApplicationChanges,
  getApplicationDeploymentDetail,
  getDeployment,
  getDeploymentDashboard,
  getDeploymentFilterOptions,
  listDeployments,
  prepareDeploy,
  queueDeployment,
  refreshAllGitStatuses,
  refreshApplicationGitStatus,
  requestCancelDeployment,
  runQueuedDeployment,
  syncApplicationRepository,
  type DeploymentListFilters,
} from "@/lib/deployments/service";

export type DeploymentActionState = {
  success?: boolean;
  error?: string;
  id?: string;
  output?: string;
};

function fail(err: unknown, fallback: string): DeploymentActionState {
  return { error: err instanceof Error ? err.message : fallback };
}

export async function getDeploymentDashboardAction() {
  await requireSession();
  return getDeploymentDashboard();
}

export async function getDeploymentDetailAction(id: string) {
  await requireSession();
  return getDeployment(id);
}

export async function getApplicationDeploymentDetailAction(applicationId: string) {
  await requireSession();
  return getApplicationDeploymentDetail(applicationId);
}

export async function listDeploymentsAction(filters: DeploymentListFilters) {
  await requireSession();
  return listDeployments(filters);
}

export async function getDeploymentFilterOptionsAction() {
  await requireSession();
  return getDeploymentFilterOptions();
}

export async function refreshGitStatusAction(
  applicationId: string
): Promise<DeploymentActionState> {
  try {
    const session = await requireWriteAccess();
    await refreshApplicationGitStatus(applicationId, session.role);
    revalidatePath("/deployments");
    return { success: true };
  } catch (err) {
    return fail(err, "Failed to refresh git status");
  }
}

export async function refreshAllGitStatusAction(): Promise<DeploymentActionState> {
  try {
    const session = await requireWriteAccess();
    const results = await refreshAllGitStatuses(session.role);
    const failed = results.filter((r) => !r.ok).length;
    revalidatePath("/deployments");
    return {
      success: true,
      output:
        failed > 0
          ? `Refreshed ${results.length - failed}/${results.length} repositories`
          : `Refreshed ${results.length} repositories`,
    };
  } catch (err) {
    return fail(err, "Failed to refresh git status");
  }
}

export async function syncRepositoryAction(
  applicationId: string
): Promise<DeploymentActionState> {
  try {
    const session = await requireWriteAccess();
    const result = await syncApplicationRepository(applicationId, session.role);
    revalidatePath("/deployments");
    return { success: true, output: result.output };
  } catch (err) {
    return fail(err, "Sync failed");
  }
}

export async function getApplicationChangesAction(applicationId: string) {
  const session = await requireWriteAccess();
  return getApplicationChanges(applicationId, session.role);
}

export async function prepareDeployAction(applicationId: string) {
  try {
    const session = await requireWriteAccess();
    const preview = await prepareDeploy(applicationId, session);
    return { success: true as const, preview };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Cannot prepare deployment",
    };
  }
}

export async function deployApplicationAction(
  applicationId: string
): Promise<DeploymentActionState> {
  try {
    const session = await requireWriteAccess();
    const { deployment } = await queueDeployment(applicationId, session);
    after(() => {
      void runQueuedDeployment(deployment.id).catch(async (err) => {
        console.error("Deployment runner failed", err);
      });
    });
    revalidatePath("/deployments");
    return { success: true, id: deployment.id };
  } catch (err) {
    return fail(err, "Failed to start deployment");
  }
}

export async function cancelDeploymentAction(
  id: string
): Promise<DeploymentActionState> {
  try {
    const session = await requireWriteAccess();
    await requestCancelDeployment(id, session);
    revalidatePath("/deployments");
    return { success: true };
  } catch (err) {
    return fail(err, "Cancel failed");
  }
}
