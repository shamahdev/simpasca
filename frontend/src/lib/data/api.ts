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
 * Calls the API as the logged-in user. Without a session, or when the API
 * rejects the token (expired or revoked), the user is sent to /login.
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
  if (!anonymous) {
    const token = await getSessionToken();
    if (!token) redirectToLogin();
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...rest, headers, cache: "no-store" });
  } catch {
    throw new DataError("UNAVAILABLE", "Server API tidak dapat dihubungi.");
  }
  if (response.status === 401 && !anonymous) redirectToLogin();
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
