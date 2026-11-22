import { mock } from "node:test";

/**
 * Replaces the session module (Next.js cookies and redirect) so the data layer
 * runs under `node --test`. Call before importing any module that imports ./api.ts.
 */
export function mockNextRequest() {
  // mock.module exists since Node 22.3; @types/node 20 does not declare it.
  const mocker = mock as unknown as {
    module(specifier: string, options: { exports: Record<string, unknown> }): void;
  };
  mocker.module("../session.ts", {
    exports: {
      getSessionToken: async () => "test-token",
      redirectToLogin: () => {
        throw new Error("redirect:/login");
      },
    },
  });
}

export interface ApiCall {
  method: string;
  path: string;
  search: URLSearchParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Record<string, string>;
}

/** Stubs fetch with a router; returns the recorded calls and a restore function. */
export function stubApi(respond: (call: ApiCall) => [status: number, body?: unknown]) {
  const calls: ApiCall[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(url);
    const call: ApiCall = {
      method: init?.method ?? "GET",
      path: pathname,
      search: searchParams,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    const [status, body] = respond(call);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = realFetch) };
}

/** A one-page list response. */
export const page = <T>(data: T[]) => ({
  data,
  meta: { page: 1, limit: 100, total: data.length, total_pages: 1 },
});
