import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskSecrets } from "./mask";

describe("maskSecrets", () => {
  it("masks URL credentials", () => {
    const out = maskSecrets("https://user:ghp_supersecrettokenvalue1234@github.com/org/repo.git");
    assert.equal(out.includes("user:"), false);
    assert.match(out, /https:\/\/\*\*\*:\*\*\*@github.com/);
  });

  it("masks GitHub tokens", () => {
    const out = maskSecrets("token ghp_abcdefghijklmnopqrstuvwxyz1234567890");
    assert.equal(out.includes("ghp_abcdefghijklmnopqrstuvwxyz1234567890"), false);
    assert.match(out, /ghp_\*\*\*/);
  });

  it("masks password assignments", () => {
    const out = maskSecrets("DATABASE_PASSWORD=hunter2secret\nAPI_KEY=abcd");
    assert.equal(out.includes("hunter2secret"), false);
    assert.match(out, /PASSWORD=\*\*\*/);
  });

  it("masks private keys", () => {
    const out = maskSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIFAKE\n-----END RSA PRIVATE KEY-----");
    assert.equal(out.includes("MIIFAKE"), false);
    assert.match(out, /\[REDACTED PRIVATE KEY\]/);
  });

  it("masks basic authorization headers", () => {
    const out = maskSecrets("AUTHORIZATION: basic dXNlcjpwYXNz");
    assert.equal(out.includes("dXNlcjpwYXNz"), false);
    assert.match(out, /AUTHORIZATION:\s*basic\s+\*\*\*/i);
  });

  it("masks bearer headers", () => {
    const out = maskSecrets("Authorization: Bearer super-secret-value");
    assert.equal(out.includes("super-secret-value"), false);
  });
});
