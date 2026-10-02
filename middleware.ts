import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifySessionCookie } from "@/lib/auth/verify-id-token";

const PUBLIC_API_ROUTES = new Set(["/api/health", "/api/country", "/api/context", "/api/auth/bootstrap", "/api/auth/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/robots.txt") {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/signup") {
    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (session) {
      try {
        await verifySessionCookie(session);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!session) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    try {
      await verifySessionCookie(session);
      return NextResponse.next();
    } catch {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "content-type": "application/json" } });
    }

    try {
      await verifySessionCookie(session);
    } catch {
      const response = NextResponse.json({ error: "Authentication expired." }, { status: 401, headers: { "content-type": "application/json" } });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};
