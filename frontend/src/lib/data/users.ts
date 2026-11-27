import type { User, UserRole } from "../types.ts";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { DataError, invalidIfAny } from "./errors.ts";

export const USER_ROLES: UserRole[] = ["PETUGAS", "SUPERADMIN"];

export interface ApiUser {
  id: number;
  name: string;
  username: string;
  role: string;
  created_at?: string;
}

export const fromApi = (u: ApiUser): User & { createdAt?: string } => ({
  id: u.id,
  name: u.name,
  username: u.username,
  role: u.role.toUpperCase() as UserRole,
  createdAt: u.created_at,
});

/** Raw form values. `password` may be empty when editing (keeps the current one). */
export interface UserInput {
  name: string;
  username: string;
  role: string;
  password: string;
}

/** Validates the account form (KF-01.4). Password rules follow the API: 12–256 characters, never trimmed. */
export function validateUserInput(input: UserInput, isNew: boolean) {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name || name.length > 150) errors.name = "Isi nama lengkap (maks. 150 karakter).";
  const username = input.username.trim();
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(username)) {
    errors.username = "3–100 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.";
  }
  if (!USER_ROLES.includes(input.role as UserRole)) errors.role = "Pilih peran Petugas atau Superadmin.";
  if (isNew || input.password) {
    if (input.password.length < 12 || input.password.length > 256) {
      errors.password = "Kata sandi 12–256 karakter.";
    }
  }
  invalidIfAny(errors, "Periksa kembali isian akun.");
  return { name, username, role: input.role as UserRole, ...(input.password && { password: input.password }) };
}

const PATH = "/api/users";

export async function listUsers() {
  const rows = await listAll<ApiUser>(PATH);
  return rows.map(fromApi).sort((a, b) => a.name.localeCompare(b.name, "id"));
}

const usernameTaken = (error: unknown) =>
  error instanceof DataError && error.code === "CONFLICT"
    ? new DataError("INVALID", "Nama pengguna sudah dipakai.", { username: "Nama pengguna sudah dipakai." })
    : error;

export async function createUser(input: UserInput) {
  const data = validateUserInput(input, true);
  try {
    return fromApi(await postJson<ApiUser>(PATH, data));
  } catch (error) {
    throw usernameTaken(error);
  }
}

async function requireUserRow(id: string) {
  const row = await getRow<ApiUser>(PATH, id);
  if (!row) throw new DataError("NOT_FOUND", "Akun tidak ditemukan.");
  return row;
}

/** Updates an account; the password changes only when a new one is given. Audited by the API without passwords (KF-09). */
export async function updateUser(id: string, input: UserInput, actor: User) {
  const data = validateUserInput(input, false);
  if (String(actor.id) === id && data.role !== "SUPERADMIN") {
    const message = "Anda tidak dapat menurunkan peran akun sendiri.";
    throw new DataError("INVALID", message, { role: message });
  }
  await requireUserRow(id);
  try {
    return fromApi(await patchJson<ApiUser>(`${PATH}/${id}`, data));
  } catch (error) {
    throw usernameTaken(error);
  }
}

/** Deletes an account. The API refuses (409) once it is referenced by any record, so history keeps its author. */
export async function deleteUser(id: string, actor: User) {
  if (String(actor.id) === id) throw new DataError("INVALID", "Anda tidak dapat menghapus akun sendiri.");
  await requireUserRow(id);
  try {
    await deleteRow(`${PATH}/${id}`);
  } catch (error) {
    if (error instanceof DataError && error.code === "CONFLICT") {
      throw new DataError(
        "CONFLICT",
        "Akun ini sudah tercatat sebagai pelaku pada data lain sehingga tidak dapat dihapus. Ganti kata sandinya untuk menonaktifkan akses.",
      );
    }
    throw error;
  }
}
