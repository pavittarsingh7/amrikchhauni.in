"use server";

import { revalidatePath } from "next/cache";
import {
  requireWriteAccess,
  requireSuperAdmin,
  requireSession,
} from "@/lib/auth/session";
import {
  listNginxConfigs,
  getNginxConfig,
  createNginxConfig,
  updateNginxConfig,
  deleteNginxConfig,
  restoreNginxBackup,
  testNginxConfig,
  reloadNginx,
  restartNginxService,
  generateSiteTemplate,
} from "@/lib/nginx/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
};

async function canAutoReload() {
  try {
    const session = await requireSuperAdmin();
    return !!session;
  } catch {
    return false;
  }
}

export async function getNginxConfigsAction() {
  await requireSession();
  return listNginxConfigs();
}

export async function getNginxConfigAction(id: string) {
  await requireSession();
  return getNginxConfig(id);
}

export async function createNginxConfigAction(input: {
  filename: string;
  content: string;
  domain?: string;
}): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const autoReload = await canAutoReload();
    await createNginxConfig(input, { autoReload });
    revalidatePath("/nginx");
    revalidatePath("/domains");
    return {
      success: true,
      output: autoReload
        ? "Created and reloaded"
        : "Created and tested. Super Admin must reload nginx.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create" };
  }
}

export async function updateNginxConfigAction(
  id: string,
  input: { content: string; domain?: string }
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const autoReload = await canAutoReload();
    await updateNginxConfig(id, input, { autoReload });
    revalidatePath("/nginx");
    return {
      success: true,
      output: autoReload
        ? "Updated and reloaded"
        : "Updated and tested. Super Admin must reload nginx.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update" };
  }
}

export async function deleteNginxConfigAction(
  id: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const autoReload = await canAutoReload();
    await deleteNginxConfig(id, { autoReload });
    revalidatePath("/nginx");
    revalidatePath("/domains");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete" };
  }
}

export async function restoreNginxBackupAction(
  backupId: string
): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const autoReload = await canAutoReload();
    await restoreNginxBackup(backupId, { autoReload });
    revalidatePath("/nginx");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to restore" };
  }
}

export async function testNginxConfigAction(): Promise<InfraActionState> {
  try {
    await requireWriteAccess();
    const result = await testNginxConfig();
    revalidatePath("/nginx");
    return {
      success: result.passed,
      output: result.output,
      error: result.passed ? undefined : result.output,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Test failed" };
  }
}

export async function reloadNginxAction(): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const output = await reloadNginx();
    revalidatePath("/nginx");
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Reload failed" };
  }
}

export async function restartNginxAction(): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const output = await restartNginxService();
    revalidatePath("/nginx");
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restart failed" };
  }
}

export async function generateNginxTemplateAction(
  domain: string,
  port: number
): Promise<{ template: string }> {
  await requireSession();
  return { template: generateSiteTemplate(domain, port) };
}
