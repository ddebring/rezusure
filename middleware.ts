import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";

const PUBLIC_API_ROUTES = new Set([
  "/api/health",
  "/api/country",
  "/api/context",
  "/api/auth/bootstrap",
  "/api/auth/logout",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  /*
   * Login / Signup
   *
   * Middleware only checks whether a session cookie exists.
   * Firebase session verification is performed server-side.
   */
  if (pathname === "/login" || pathname === "/signup") {
    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (session) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }

    return NextResponse.next();
  }

  /*
   * Dashboard
   *
   * Middleware only checks cookie presence.
   * The dashboard server components perform the actual
   * Firebase session verification.
   */
  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!session) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  /*
   * API routes
   *
   * Do not verify Firebase Admin sessions in middleware.
   * Individual API routes perform the actual authentication.
   */
  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/api/:path*",
  ],
};