import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gitExec, GitError, compareWithRemote, assertGitRepository, type GitExecFn } from "./service";
import type { ExecCaptureResult } from "@/lib/shell/exec";

function ok(stdout = ""): ExecCaptureResult {
  return { ok: true, stdout, stderr: "", exitCode: 0 };
}

function fail(stderr: string, exitCode = 1): ExecCaptureResult {
  return { ok: false, stdout: "", stderr, exitCode };
}

describe("gitExec allowlist", () => {
  it("rejects unknown git subcommands", async () => {
    await assert.rejects(
      () => gitExec("D:\\repo", ["reset", "--hard"], { exec: async () => ok() }),
      GitError
    );
  });

  it("allows fetch", async () => {
    const result = await gitExec("D:\\repo", ["fetch", "origin", "--prune"], {
      exec: async (_cmd, args) => {
        assert.equal(args[0], "fetch");
        return ok();
      },
    });
    assert.equal(result.ok, true);
  });
});

describe("compareWithRemote", () => {
  const exec: GitExecFn = async (_cmd, args) => {
    if (args[0] === "fetch") return ok();
    if (args[0] === "rev-parse" && args[1] === "HEAD") return ok("a83f21d\n");
    if (args[0] === "rev-parse") return ok("b91ac32\n");
    if (args[0] === "rev-list") return ok("0\t3\n");
    if (args[0] === "status") return ok("");
    if (args[0] === "log" && args.join(" ").includes("HEAD..")) {
      return ok("b91ac32\tfeat: deploy page\tDev\t2026-09-01T00:00:00Z\n");
    }
    if (args[0] === "log") return ok("a83f21d\tinit\tDev\t2026-08-01T00:00:00Z\n");
    if (args[0] === "diff") return ok("src/app.ts\n");
    return fail(`unexpected ${args.join(" ")}`);
  };

  it("reports commits behind without scanning the filesystem", async () => {
    const result = await compareWithRemote("D:\\projects\\api", "main", { exec });
    assert.equal(result.localCommit, "a83f21d");
    assert.equal(result.remoteCommit, "b91ac32");
    assert.equal(result.behind, 3);
    assert.equal(result.ahead, 0);
    assert.equal(result.incoming.length, 1);
    assert.deepEqual(result.changedFiles, ["src/app.ts"]);
  });

  it("surfaces fetch failures", async () => {
    await assert.rejects(
      () =>
        compareWithRemote("D:\\missing", "main", {
          exec: async (_cmd, args) =>
            args[0] === "fetch" ? fail("fatal: not a git repository") : ok(),
        }),
      /not a git repository/i
    );
  });

  it("treats an unknown remote branch as missing remote head", async () => {
    const result = await compareWithRemote("D:\\projects\\api", "does-not-exist", {
      exec: async (_cmd, args) => {
        if (args[0] === "fetch") return ok();
        if (args[0] === "rev-parse" && args[1] === "HEAD") return ok("a83f21d\n");
        if (args[0] === "rev-parse") return fail("fatal: needed a single revision", 128);
        if (args[0] === "status") return ok("");
        if (args[0] === "log") return ok("");
        return fail(`unexpected ${args.join(" ")}`);
      },
    });
    assert.equal(result.localCommit, "a83f21d");
    assert.equal(result.remoteCommit, null);
    assert.equal(result.behind, 0);
  });
});

describe("assertGitRepository", () => {
  it("rejects a missing repository path", async () => {
    await assert.rejects(
      () => assertGitRepository("D:\\acdm-definitely-missing-repo-path"),
      /does not exist/i
    );
  });
});

