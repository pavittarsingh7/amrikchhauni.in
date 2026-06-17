"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireSession } from "@/lib/auth/session";
import {
  listSslCertificates,
  persistSslDiscovery,
  renewSslCertificate,
  createSslCertificate,
} from "@/lib/ssl/service";

export type InfraActionState = {
  success?: boolean;
  error?: string;
  output?: string;
};

export async function getSslCertificatesAction() {
  await requireSession();
  return listSslCertificates();
}

export async function discoverSslAction(): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const result = await persistSslDiscovery();
    revalidatePath("/ssl");
    return {
      success: true,
      output: `Discovered ${result.discovered} certificates`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function renewSslAction(id: string): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const output = await renewSslCertificate(id);
    revalidatePath("/ssl");
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Renewal failed" };
  }
}

export async function createSslAction(input: {
  domain: string;
  email: string;
  webroot: string;
}): Promise<InfraActionState> {
  try {
    await requireSuperAdmin();
    const output = await createSslCertificate(input);
    revalidatePath("/ssl");
    return { success: true, output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Creation failed" };
  }
}
