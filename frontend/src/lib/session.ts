import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** httpOnly cookie holding the API's JWT (checked optimistically by proxy.ts). */
export const SESSION_COOKIE = "simpasca_session";

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function startSession(token: string, maxAgeSeconds: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** No (valid) session: back to the login page. */
export function redirectToLogin(): never {
  redirect("/login");
}
