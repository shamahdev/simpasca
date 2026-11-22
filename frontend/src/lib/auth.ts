import { cache } from "react";
import { apiRequest, getRow } from "./data/api.ts";
import type { User, UserRole } from "./types.ts";

interface ApiUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

const fromApi = (u: ApiUser): User => ({
  id: u.id,
  name: u.name,
  username: u.username,
  role: u.role as UserRole,
});

/** The logged-in user (GET /api/auth/me); redirects to /login without a valid session. Once per request. */
export const getCurrentUser = cache(async (): Promise<User> => {
  const { data } = await apiRequest<{ data: ApiUser }>("/api/auth/me");
  return fromApi(data);
});

/** Display name for a `created_by` id. */
export const getUserName = cache(async (id: number): Promise<string> => {
  const user = await getRow<ApiUser>("/api/users", String(id));
  return user?.name ?? `Pengguna #${id}`;
});
