import type { User } from "./types";

// The backend seeds one admin user with id 1; created_by must reference it.
export const users: User[] = [
  { id: 1, username: "admin", name: "Shaddam Amru", role: "SUPERADMIN" },
];

// shortcut: login (UC-01) is not built yet, so every request acts as the seeded admin; replace with the session user.
export function getCurrentUser(): User {
  return users[0];
}

export function getUserName(id: number): string {
  return users.find((u) => u.id === id)?.name ?? `Pengguna #${id}`;
}
