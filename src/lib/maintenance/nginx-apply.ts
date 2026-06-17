import { writeAuditLog } from "@/lib/audit/logger";
import { testNginxConfig, reloadNginx } from "@/lib/nginx/service";
import {
  rollbackNginxChanges,
  type NginxRollbackEntry,
} from "./nginx-config";

export async function finalizeNginxMaintenanceChange(
  rollback: NginxRollbackEntry[],
  options: {
    autoReload?: boolean;
    onRollback?: () => Promise<void>;
    auditEntityId?: string;
    auditAction?: string;
  } = {}
): Promise<void> {
  const test = await testNginxConfig();

  if (test.passed) {
    if (options.autoReload) {
      await reloadNginx();
    }
    return;
  }

  await rollbackNginxChanges(rollback);
  if (options.onRollback) {
    await options.onRollback();
  }

  const rollbackTest = await testNginxConfig();

  if (rollbackTest.passed && options.autoReload) {
    await reloadNginx();
  }

  await writeAuditLog({
    action: "ROLLBACK",
    module: "maintenance",
    entityId: options.auditEntityId,
    after: {
      trigger: options.auditAction ?? "maintenance_change",
      testOutput: test.output,
      rollbackTestPassed: rollbackTest.passed,
      rollbackTestOutput: rollbackTest.passed ? undefined : rollbackTest.output,
    },
  });

  if (!rollbackTest.passed) {
    throw new Error(
      `Nginx configuration is invalid after rollback — manual intervention required: ${rollbackTest.output}`
    );
  }

  throw new Error(`Nginx test failed — changes rolled back: ${test.output}`);
}
