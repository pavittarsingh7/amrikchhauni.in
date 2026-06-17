"use server";

import { requireSession } from "@/lib/auth/session";
import {
  listAuditLogs,
  getAuditLog,
  getAuditFilterOptions,
  type AuditLogFilters,
} from "@/lib/audit/service";

export async function getAuditLogsAction(filters: AuditLogFilters = {}) {
  await requireSession();
  return listAuditLogs(filters);
}

export async function getAuditLogDetailAction(id: string) {
  await requireSession();
  return getAuditLog(id);
}

export async function getAuditFilterOptionsAction() {
  await requireSession();
  return getAuditFilterOptions();
}

export async function exportAuditLogsAction(filters: AuditLogFilters = {}) {
  await requireSession();
  const { items } = await listAuditLogs({ ...filters, page: 1, pageSize: 1000 });
  const header = "timestamp,username,action,module,entityId,ipAddress\n";
  const rows = items
    .map(
      (l) =>
        `${l.createdAt.toISOString()},${l.username ?? ""},${l.action},${l.module},${l.entityId ?? ""},${l.ipAddress ?? ""}`
    )
    .join("\n");
  return header + rows;
}
