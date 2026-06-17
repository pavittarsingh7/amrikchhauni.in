"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireSession } from "@/lib/auth/session";
import {
  persistNginxDiscovery,
  persistPm2Discovery,
  persistIisDiscovery,
  persistApplicationDiscovery,
  runAllDiscovery,
  approveDiscoverySuggestion,
  rejectDiscoverySuggestion,
} from "@/lib/discovery/persist";
import type { DiscoveryRunSummary } from "@/lib/discovery/types";

export type DiscoveryActionState = {
  success?: boolean;
  error?: string;
  summary?: DiscoveryRunSummary;
};

export async function runNginxDiscoveryAction(): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    const result = await persistNginxDiscovery();
    revalidatePath("/nginx");
    revalidatePath("/domains");
    revalidatePath("/discovery");
    return {
      success: result.errors.length === 0,
      summary: { nginx: result, pm2: empty(), iis: empty(), application: empty() },
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function runPm2DiscoveryAction(): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    const result = await persistPm2Discovery();
    revalidatePath("/pm2");
    revalidatePath("/ports");
    revalidatePath("/discovery");
    return {
      success: result.errors.length === 0,
      summary: { nginx: empty(), pm2: result, iis: empty(), application: empty() },
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function runIisDiscoveryAction(): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    const result = await persistIisDiscovery();
    revalidatePath("/iis");
    revalidatePath("/discovery");
    return {
      success: result.errors.length === 0,
      summary: { nginx: empty(), pm2: empty(), iis: result, application: empty() },
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function runApplicationDiscoveryAction(): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    const result = await persistApplicationDiscovery();
    revalidatePath("/applications");
    revalidatePath("/discovery");
    return {
      success: result.errors.length === 0,
      summary: { nginx: empty(), pm2: empty(), iis: empty(), application: result },
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function runAllDiscoveryAction(): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    const summary = await runAllDiscovery();
    revalidatePath("/discovery");
    revalidatePath("/nginx");
    revalidatePath("/pm2");
    revalidatePath("/iis");
    revalidatePath("/domains");
    revalidatePath("/ports");
    revalidatePath("/applications");

    const errors = [
      ...summary.nginx.errors,
      ...summary.pm2.errors,
      ...summary.iis.errors,
      ...summary.application.errors,
    ];

    if (errors.length > 0) {
      return { success: false, summary, error: errors.join("; ") };
    }

    return { success: true, summary };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discovery failed" };
  }
}

export async function approveSuggestionAction(
  suggestionId: string
): Promise<DiscoveryActionState> {
  try {
    const session = await requireWriteAccess();
    await approveDiscoverySuggestion(suggestionId, session.id);
    revalidatePath("/applications");
    revalidatePath("/discovery");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Approval failed" };
  }
}

export async function rejectSuggestionAction(
  suggestionId: string,
  notes?: string
): Promise<DiscoveryActionState> {
  try {
    await requireWriteAccess();
    await rejectDiscoverySuggestion(suggestionId, notes);
    revalidatePath("/discovery");
    revalidatePath("/applications");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Rejection failed" };
  }
}

function empty() {
  return { success: true, discovered: 0, created: 0, updated: 0, errors: [], items: [] };
}

export async function getDiscoveryStatsAction() {
  await requireSession();
  const { prisma } = await import("@/lib/db/prisma");

  const [
    nginxCount,
    domainCount,
    pm2Count,
    iisCount,
    pendingSuggestions,
    lastAudit,
  ] = await Promise.all([
    prisma.nginxConfig.count(),
    prisma.domain.count({ where: { discovered: true } }),
    prisma.pm2Process.count(),
    prisma.iisSite.count(),
    prisma.discoverySuggestion.count({ where: { status: "PENDING" } }),
    prisma.auditLog.findFirst({
      where: { action: "DISCOVER" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    nginxCount,
    domainCount,
    pm2Count,
    iisCount,
    pendingSuggestions,
    lastDiscoveryAt: lastAudit?.createdAt ?? null,
  };
}
