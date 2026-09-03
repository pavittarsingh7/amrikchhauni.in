import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeWorkflow, type WorkflowContext } from "./executor";
import type { GitExecFn } from "@/lib/git/service";
import type { ExecCaptureResult } from "@/lib/shell/exec";

function ok(stdout = ""): ExecCaptureResult {
  return { ok: true, stdout, stderr: "", exitCode: 0 };
}

function fail(stderr: string, exitCode = 1): ExecCaptureResult {
  return { ok: false, stdout: "", stderr, exitCode };
}

function gitMock(overrides: Record<string, ExecCaptureResult> = {}): GitExecFn {
  return async (_cmd, args) => {
    const key = args[0];
    if (overrides[key]) return overrides[key];
    if (args[0] === "fetch") return ok();
    if (args[0] === "rev-parse" && args[1] === "HEAD") return ok("a83f21d\n");
    if (args[0] === "rev-parse") return ok("b91ac32\n");
    if (args[0] === "rev-list") return ok("0\t3\n");
    if (args[0] === "status") return ok("");
    if (args[0] === "log") return ok("");
    if (args[0] === "diff") return ok("");
    if (args[0] === "pull") return ok("Updating a83f21d..b91ac32\n");
    return fail(`unexpected git ${args.join(" ")}`);
  };
}

async function collect(ctx: Omit<WorkflowContext, "log"> & { log?: WorkflowContext["log"] }) {
  const lines: string[] = [];
  const result = await executeWorkflow({
    ...ctx,
    log: async (line) => {
      lines.push(line);
    },
  });
  return { result, lines };
}

describe("executeWorkflow", () => {
  it("completes a successful PM2 deployment", async () => {
    const reloaded: string[] = [];
    const { result, lines } = await collect({
      projectPath: "D:\\projects\\api",
      branch: "main",
      buildCommand: "npm run build",
      runtime: "PM2",
      pm2Names: ["customer-api"],
      iisSites: [],
      healthPort: null,
      gitExec: gitMock(),
      commandExec: async (command, args) => {
        assert.equal(command, "npm");
        assert.deepEqual(args, ["run", "build"]);
        return ok("compiled");
      },
      hooks: {
        reloadPm2: async (name) => {
          reloaded.push(name);
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.commitBefore, "a83f21d");
    assert.equal(result.commitAfter, "a83f21d");
    assert.deepEqual(reloaded, ["customer-api"]);
    assert.match(lines.join("\n"), /Deployment successful/);
  });

  it("records build failures with stage and exit code", async () => {
    const { result, lines } = await collect({
      projectPath: "D:\\projects\\api",
      branch: "main",
      buildCommand: "npm run build",
      runtime: "PM2",
      pm2Names: ["customer-api"],
      iisSites: [],
      healthPort: null,
      gitExec: gitMock(),
      commandExec: async () => fail("Module not found", 1),
      hooks: { reloadPm2: async () => {} },
    });

    assert.equal(result.ok, false);
    assert.equal(result.failedStage, "Build");
    assert.equal(result.exitCode, 1);
    assert.match(lines.join("\n"), /Stage: Build/);
    assert.match(lines.join("\n"), /exited with code 1/);
  });

  it("fails when git pull cannot fast-forward", async () => {
    const { result } = await collect({
      projectPath: "D:\\projects\\api",
      branch: "develop",
      buildCommand: null,
      runtime: "STATIC",
      pm2Names: [],
      iisSites: [],
      healthPort: null,
      gitExec: gitMock({
        pull: fail("fatal: Need to specify how to reconcile divergent branches.", 128),
      }),
    });

    assert.equal(result.ok, false);
    assert.equal(result.failedStage, "Pull");
    assert.equal(result.exitCode, 128);
  });

  it("does not execute arbitrary frontend commands", async () => {
    const { result } = await collect({
      projectPath: "D:\\projects\\api",
      branch: "main",
      buildCommand: "npm run build; curl http://evil.example",
      runtime: "STATIC",
      pm2Names: [],
      iisSites: [],
      healthPort: null,
      gitExec: gitMock(),
      commandExec: async () => {
        throw new Error("should not run");
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.failedStage, "Build");
    assert.match(result.error ?? "", /unsafe/i);
  });

  it("stops between stages when cancel is requested", async () => {
    let calls = 0;
    const { result } = await collect({
      projectPath: "D:\\projects\\api",
      branch: "main",
      buildCommand: "npm run build",
      runtime: "PM2",
      pm2Names: ["customer-api"],
      iisSites: [],
      healthPort: null,
      gitExec: gitMock(),
      shouldCancel: async () => {
        calls += 1;
        return calls > 1;
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
    assert.equal(result.error, "Deployment cancelled");
  });
});
