import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { stubApi } from "./test-helpers.ts";

// Session token per test: undefined = visitor (warga), a string = signed-in staff.
let session: string | undefined;
(mock as unknown as { module(s: string, o: { exports: Record<string, unknown> }): void }).module(
  "../session.ts",
  {
    exports: {
      getSessionToken: async () => session,
      redirectToLogin: () => {
        throw new Error("redirect:/login");
      },
    },
  },
);
process.env.SIMPASCA_PUBLIC_USERNAME = "publik";
process.env.SIMPASCA_PUBLIC_PASSWORD = "sandi-publik";
const { apiRequest } = await import("./api.ts");

let restore = () => {};
afterEach(() => restore());

let issued = 0;
function backend(rejectToken?: string) {
  const api = stubApi((call) => {
    if (call.path === "/api/auth/login") {
      return [200, { data: { access_token: `publik-${++issued}`, expires_in: 3600 } }];
    }
    return call.headers.Authorization === `Bearer ${rejectToken}` ? [401, { message: "Token tidak valid" }] : [200, { data: [] }];
  });
  restore = api.restore;
  return api.calls;
}

test("visitors read through the public account, logging in once", async () => {
  session = undefined;
  const calls = backend();
  await apiRequest("/api/disasters");
  await apiRequest("/api/shipments");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["POST /api/auth/login", "GET /api/disasters", "GET /api/shipments"]);
  assert.deepEqual(calls[0].body, { username: "publik", password: "sandi-publik" });
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[1].headers.Authorization, calls[2].headers.Authorization);
});

test("visitors cannot write: they are sent to /login before any request", async () => {
  session = undefined;
  const calls = backend();
  await assert.rejects(apiRequest("/api/disasters", { method: "POST", body: "{}" }), /redirect:\/login/);
  assert.equal(calls.length, 0);
});

test("staff read and write with their own token", async () => {
  session = "staff-token";
  const calls = backend();
  await apiRequest("/api/disasters");
  await apiRequest("/api/disasters", { method: "POST", body: "{}" });
  assert.deepEqual(calls.map((c) => c.headers.Authorization), ["Bearer staff-token", "Bearer staff-token"]);
});

test("a rejected staff token goes to /login; a revoked public token is renewed once", async () => {
  session = "expired";
  backend("expired");
  await assert.rejects(apiRequest("/api/disasters"), /redirect:\/login/);

  session = undefined;
  const current = `publik-${issued}`; // the cached public token from the first test
  const calls = backend(current);
  await apiRequest("/api/disasters");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path} ${c.headers.Authorization ?? ""}`.trim()), [
    `GET /api/disasters Bearer ${current}`,
    "POST /api/auth/login",
    `GET /api/disasters Bearer publik-${issued}`,
  ]);
});
