import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDeployPermission,
  gitHealthLabel,
  validateDeployTarget,
} from "./validation";

const app = {
  id: "app-1",
  name: "Customer API",
  status: "LIVE",
  projectPath: "D:\\projects\\api",
  branch: "main",
  repositoryUrl: "https://github.com/acme/api.git",
  buildCommand: "npm run build",
  startCommand: "npm start",
  deploymentType: { name: "PM2" },
};

describe("assertDeployPermission", () => {
  it("allows administrators and super admins", () => {
    assert.doesNotThrow(() => assertDeployPermission("ADMINISTRATOR"));
    assert.doesNotThrow(() => assertDeployPermission("SUPER_ADMIN"));
  });

  it("rejects viewers", () => {
    assert.throws(() => assertDeployPermission("VIEWER"), /Forbidden/);
  });
});

describe("validateDeployTarget", () => {
  it("rejects missing applications", () => {
    assert.throws(() => validateDeployTarget(null), /not found/i);
  });

  it("rejects archived applications", () => {
    assert.throws(
      () => validateDeployTarget({ ...app, status: "ARCHIVED" }),
      /archived/i
    );
  });

  it("rejects applications without a project path", () => {
    assert.throws(
      () => validateDeployTarget({ ...app, projectPath: null }),
      /project path/i
    );
  });

  it("accepts a configured application", () => {
    const result = validateDeployTarget(app);
    assert.equal(result.id, "app-1");
  });
});

describe("gitHealthLabel", () => {
  it("maps cache state to dashboard labels", () => {
    assert.equal(gitHealthLabel({ deploying: true }), "Running");
    assert.equal(gitHealthLabel({ lastError: "not a repo" }), "Error");
    assert.equal(gitHealthLabel({ lastStatus: "FAILED", localCommit: "abc" }), "Error");
    assert.equal(gitHealthLabel({ behind: 3, localCommit: "abc" }), "Update");
    assert.equal(gitHealthLabel({ behind: 0, localCommit: "abc" }), "Healthy");
    assert.equal(gitHealthLabel({}), "Unknown");
  });
});
