import { getSessionToken, redirectToLogin } from "../session.ts";
import { DataError } from "./errors.ts";

/** Base URL of the SIMPASCA backend (docs: /docs/api/). */
export const API_URL =
  process.env.SIMPASCA_API_URL ?? "https://api.simpasca.shiddiq.dev";

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

const codeFor = (status: number): DataError["code"] =>
  status === 404
    ? "NOT_FOUND"
    : status === 409
      ? "CONFLICT"
      : status >= 500
        ? "UNAVAILABLE"
        : "INVALID";

/**
 * Calls the API. A signed-in user calls it with their own token; a visitor
 * without a session may only read (GET), without a token: the API opens reads
 * to the public for transparency, except accounts. Writing without a session,
 * or a rejected (expired or revoked) session token, sends the user to /login.
 * Errors arrive as `{ message }` in Indonesian and become a DataError.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit & { anonymous?: boolean } = {},
): Promise<T> {
  const { anonymous, ...rest } = init;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const session = anonymous ? undefined : await getSessionToken();
  if (!anonymous && !session && (rest.method ?? "GET") !== "GET") redirectToLogin();
  if (session) headers.Authorization = `Bearer ${session}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...rest, headers, cache: "no-store" });
  } catch {
    throw new DataError("UNAVAILABLE", "Server API tidak dapat dihubungi.");
  }
  if (response.status === 401 && session) redirectToLogin();
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DataError(
      codeFor(response.status),
      body?.message ?? `Permintaan ke server gagal (${response.status}).`,
    );
  }
  return body as T;
}

export const postJson = <T>(path: string, body: unknown) =>
  apiRequest<{ data: T }>(path, { method: "POST", body: JSON.stringify(body) }).then((r) => r.data);

export const patchJson = <T>(path: string, body: unknown) =>
  apiRequest<{ data: T }>(path, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.data);

export const deleteRow = (path: string) => apiRequest<void>(path, { method: "DELETE" });

/** GET a single row; undefined when it does not exist (or the id is not an API id). */
export async function getRow<T>(path: string, id: string): Promise<T | undefined> {
  if (!/^\d{1,10}$/.test(id)) return undefined;
  try {
    return (await apiRequest<{ data: T }>(`${path}/${id}`)).data;
  } catch (error) {
    if (error instanceof DataError && error.code === "NOT_FOUND") return undefined;
    throw error;
  }
}

/**
 * Every live row of a list endpoint, following pagination (max 100 per page).
 * shortcut: loads whole tables per request; fine for the expected volume, add server-side aggregates to the API if it grows.
 */
export async function listAll<T>(path: string, filter: Record<string, string> = {}): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ ...filter, page: String(page), limit: "100" });
    const { data, meta } = await apiRequest<Page<T>>(`${path}?${params}`);
    rows.push(...data);
    if (page >= meta.total_pages) return rows;
  }
}

/** One page of a list endpoint, for tables that page on the server. */
export async function listPage<T>(path: string, page: number, filter: Record<string, string> = {}, limit = 20) {
  const params = new URLSearchParams({ ...filter, page: String(Math.max(1, page)), limit: String(limit) });
  const { data, meta } = await apiRequest<Page<T>>(`${path}?${params}`);
  return { rows: data, page: meta.page, totalPages: Math.max(1, meta.total_pages), total: meta.total };
}
