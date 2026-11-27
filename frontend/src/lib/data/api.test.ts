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
const { apiRequest } = await import("./api.ts");

let restore = () => {};
afterEach(() => restore());

function backend(rejectToken?: string) {
  const api = stubApi((call) =>
    call.headers.Authorization === `Bearer ${rejectToken}` || (call.path === "/api/users" && !call.headers.Authorization)
      ? [401, { message: "Token tidak valid" }]
      : [200, { data: [] }],
  );
  restore = api.restore;
  return api.calls;
}

test("visitors read without a token; the API keeps reads public", async () => {
  session = undefined;
  const calls = backend();
  await apiRequest("/api/disasters");
  await apiRequest("/api/shipments");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path} ${c.headers.Authorization ?? ""}`.trim()), [
    "GET /api/disasters",
    "GET /api/shipments",
  ]);
});

test("a visitor refused by the API (accounts) gets the error, not a login redirect", async () => {
  session = undefined;
  backend();
  await assert.rejects(apiRequest("/api/users"), /Token tidak valid/);
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

test("a rejected staff token goes to /login", async () => {
  session = "expired";
  backend("expired");
  await assert.rejects(apiRequest("/api/disasters"), /redirect:\/login/);
});
