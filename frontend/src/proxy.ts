import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session";

/** Optimistic check: without a session cookie every page goes to /login. The API validates the token itself. */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
