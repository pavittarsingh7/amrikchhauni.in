import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBasicAuthHeader,
  buildGitAuthEnv,
  explainGitRemoteFailure,
  isHttpsRemoteUrl,
  isSshRemoteUrl,
} from "./auth";

describe("buildBasicAuthHeader", () => {
  it("encodes username:token as basic auth", () => {
    const header = buildBasicAuthHeader("x-access-token", "ghp_testtokenvalue");
    assert.match(header, /^AUTHORIZATION: basic /);
    const b64 = header.slice("AUTHORIZATION: basic ".length);
    assert.equal(Buffer.from(b64, "base64").toString("utf8"), "x-access-token:ghp_testtokenvalue");
  });
});

describe("buildGitAuthEnv", () => {
  it("injects http.extraHeader for https_token mode", () => {
    const env = buildGitAuthEnv(
      { mode: "https_token", username: "x-access-token", token: "ghp_abc" },
      "https://github.com/acme/private.git"
    );
    assert.equal(env.GIT_TERMINAL_PROMPT, "0");
    assert.equal(env.GIT_CONFIG_COUNT, "1");
    assert.equal(env.GIT_CONFIG_KEY_0, "http.extraHeader");
    assert.ok(env.GIT_CONFIG_VALUE_0?.startsWith("AUTHORIZATION: basic "));
  });

  it("does not inject HTTPS headers for SSH remotes", () => {
    const env = buildGitAuthEnv(
      { mode: "https_token", username: "x-access-token", token: "ghp_abc" },
      "git@github.com:acme/private.git"
    );
    assert.equal(env.GIT_CONFIG_COUNT, undefined);
  });

  it("does not inject credentials when mode is none", () => {
    const env = buildGitAuthEnv({ mode: "none" }, "https://github.com/acme/private.git");
    assert.equal(env.GIT_CONFIG_COUNT, undefined);
    assert.equal(env.GIT_TERMINAL_PROMPT, "0");
  });
});

describe("explainGitRemoteFailure", () => {
  it("guides users to configure a PAT when auth fails without token", () => {
    const msg = explainGitRemoteFailure("Authentication failed for 'https://github.com/acme/app.git/'", {
      hasTokenConfigured: false,
      remoteUrl: "https://github.com/acme/app.git",
    });
    assert.match(msg, /Personal Access Token/i);
    assert.match(msg, /Settings → Git/i);
  });

  it("mentions SSH keys for SSH remotes", () => {
    const msg = explainGitRemoteFailure("Permission denied (publickey).", {
      hasTokenConfigured: false,
      remoteUrl: "git@github.com:acme/app.git",
    });
    assert.match(msg, /SSH/i);
  });
});

describe("remote url helpers", () => {
  it("detects https and ssh remotes", () => {
    assert.equal(isHttpsRemoteUrl("https://github.com/a/b.git"), true);
    assert.equal(isSshRemoteUrl("git@github.com:a/b.git"), true);
    assert.equal(isHttpsRemoteUrl("git@github.com:a/b.git"), false);
  });
});
