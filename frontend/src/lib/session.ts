import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EDITOR_COOKIE } from "./editor-cookie.ts";

/** httpOnly cookie holding the API's JWT of a signed-in user. */
export const SESSION_COOKIE = "simpasca_session";

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function startSession(token: string, maxAgeSeconds: number) {
  const jar = await cookies();
  const options = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
  jar.set(SESSION_COOKIE, token, { ...options, httpOnly: true });
  // Readable flag so client components can show edit controls; it grants nothing, the server checks the session.
  jar.set(EDITOR_COOKIE, "1", options);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(EDITOR_COOKIE);
}

/** No (valid) session: back to the login page. */
export function redirectToLogin(): never {
  redirect("/login");
}
