import { NextResponse } from "next/server";
import { AppError } from "@/domain/common/result";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";

function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(`${SESSION_COOKIE_NAME}=`.length));
}

export async function GET(request: Request) {
  try {
    const token = getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const decoded = await verifyFirebaseSessionCookie(token);
    return NextResponse.json({
      ok: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        photoURL: decoded.picture ?? null,
        provider: decoded.firebase?.sign_in_provider ?? "password",
      },
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("Unable to load session.", "SESSION_LOAD_FAILED", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
