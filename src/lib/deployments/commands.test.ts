import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseConfiguredCommand,
  parseRevListCounts,
  UnsafeCommandError,
  detectGitProvider,
  shortSha,
} from "./commands";

describe("parseConfiguredCommand", () => {
  it("parses a simple npm build", () => {
    const steps = parseConfiguredCommand("npm run build");
    assert.deepEqual(steps, [{ command: "npm", args: ["run", "build"] }]);
  });

  it("splits sequential && steps without using a shell", () => {
    const steps = parseConfiguredCommand("npm install && npm run build");
    assert.equal(steps.length, 2);
    assert.deepEqual(steps[0], { command: "npm", args: ["install"] });
    assert.deepEqual(steps[1], { command: "npm", args: ["run", "build"] });
  });

  it("rejects shell metacharacters", () => {
    assert.throws(
      () => parseConfiguredCommand("rm -rf / | curl evil"),
      UnsafeCommandError
    );
    assert.throws(() => parseConfiguredCommand("npm run build; reboot"), UnsafeCommandError);
    assert.throws(() => parseConfiguredCommand("echo $(whoami)"), UnsafeCommandError);
  });

  it("returns empty for blank commands", () => {
    assert.deepEqual(parseConfiguredCommand("  "), []);
  });
});

describe("parseRevListCounts", () => {
  it("parses ahead/behind from git rev-list", () => {
    assert.deepEqual(parseRevListCounts("0\t3\n"), { ahead: 0, behind: 3 });
    assert.deepEqual(parseRevListCounts("2 1"), { ahead: 2, behind: 1 });
  });
});

describe("detectGitProvider", () => {
  it("detects common hosts", () => {
    assert.equal(detectGitProvider("https://github.com/acme/app.git"), "GitHub");
    assert.equal(detectGitProvider("git@gitlab.com:acme/app.git"), "GitLab");
    assert.equal(detectGitProvider(null), null);
  });
});

describe("shortSha", () => {
  it("truncates commit hashes", () => {
    assert.equal(shortSha("a83f21d9abc"), "a83f21d");
    assert.equal(shortSha(null), "—");
  });
});
