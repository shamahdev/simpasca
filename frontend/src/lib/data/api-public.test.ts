import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { stubApi } from "./test-helpers.ts";

// Visitor (no session cookie): every read must go through the public account.
(mock as unknown as { module(s: string, o: { exports: Record<string, unknown> }): void }).module(
  "../session.ts",
  {
    exports: {
      getSessionToken: async () => undefined,
      redirectToLogin: () => {
        throw new Error("redirect:/login");
      },
    },
  },
);
process.env.SIMPASCA_PUBLIC_USERNAME = "publik";
process.env.SIMPASCA_PUBLIC_PASSWORD = "salah";
const { apiRequest, hasPublicReadAccount, publicTokenLeaseSeconds } = await import("./api.ts");

let restore = () => {};
afterEach(() => restore());

test("a rejected public login is remembered, not retried on every read", async () => {
  const api = stubApi(() => [401, { message: "Username atau password salah." }]);
  restore = api.restore;

  await assert.rejects(apiRequest("/api/disasters"), /Username atau password salah/);
  await assert.rejects(apiRequest("/api/shipments"), /Username atau password salah/);
  assert.deepEqual(
    api.calls.map((call) => `${call.method} ${call.path}`),
    ["POST /api/auth/login"],
  );
});

test("the public account counts as configured only with both variables", () => {
  assert.equal(hasPublicReadAccount(), true);
  delete process.env.SIMPASCA_PUBLIC_PASSWORD;
  assert.equal(hasPublicReadAccount(), false);
});

test("a token lease never collapses to nothing", () => {
  assert.equal(publicTokenLeaseSeconds(3600), 3540);
  assert.equal(publicTokenLeaseSeconds(undefined), 3540);
  assert.equal(publicTokenLeaseSeconds(30), 30);
});
