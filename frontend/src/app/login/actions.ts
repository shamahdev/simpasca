"use server";

import { redirect } from "next/navigation";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { apiRequest } from "@/lib/data/api";
import { DataError } from "@/lib/data/errors";
import { endSession, startSession } from "@/lib/session";

/** Login (UC-01): exchanges username + password for the API's JWT, kept in an httpOnly cookie. */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = field(formData, "username").trim();
  const password = field(formData, "password");
  if (!username || !password) {
    return {
      status: "error",
      message: "Isi nama pengguna dan kata sandi.",
      fieldErrors: {
        ...(!username && { username: "Nama pengguna wajib diisi." }),
        ...(!password && { password: "Kata sandi wajib diisi." }),
      },
    };
  }

  try {
    const { data } = await apiRequest<{ data: { access_token: string; expires_in: number } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }), anonymous: true },
    );
    await startSession(data.access_token, data.expires_in);
  } catch (error) {
    if (error instanceof DataError && error.code === "INVALID") {
      return { status: "error", message: "Nama pengguna atau kata sandi salah." };
    }
    return errorState(error);
  }
  redirect("/");
}

/** Revokes the token at the API and clears the session. */
export async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // An expired or revoked token cannot be revoked again; signing out locally is enough.
  }
  await endSession();
  redirect("/login");
}
