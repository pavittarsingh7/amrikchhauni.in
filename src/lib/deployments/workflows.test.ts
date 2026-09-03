import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWorkflow, normalizeRuntime, runtimeActionSummary } from "./workflows";

describe("normalizeRuntime", () => {
  it("maps known deployment types", () => {
    assert.equal(normalizeRuntime("PM2"), "PM2");
    assert.equal(normalizeRuntime("iis"), "IIS");
    assert.equal(normalizeRuntime("Windows Service"), "WINDOWS_SERVICE");
    assert.equal(normalizeRuntime("other"), "UNKNOWN");
  });
});

describe("buildWorkflow", () => {
  it("builds a PM2 workflow with build and health", () => {
    const stages = buildWorkflow({ runtime: "PM2", hasBuildCommand: true }).map((s) => s.id);
    assert.deepEqual(stages, ["fetch", "pull", "build", "runtime", "health"]);
  });

  it("skips runtime restart for static sites", () => {
    const stages = buildWorkflow({ runtime: "STATIC", hasBuildCommand: false }).map((s) => s.kind);
    assert.deepEqual(stages, ["git-fetch", "git-pull"]);
  });

  it("does not invent a docker compose process", () => {
    const summary = runtimeActionSummary("DOCKER");
    assert.match(summary, /manual/i);
  });
});
