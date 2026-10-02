import { AppError } from "@/domain/common/result";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import {
  getBearerToken,
  requireAuthenticatedRequest,
  verifyAuthToken,
  verifyFirebaseIdToken,
  verifyFirebaseSessionCookie,
  verifyIdToken,
  verifySessionCookie,
} from "@/lib/auth/verify-id-token";

export function getSessionTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.slice(`${SESSION_COOKIE_NAME}=`.length);
  return token ? decodeURIComponent(token) : null;
}

export async function verifyBearerToken(request: Request) {
  const bearerToken = getBearerToken(request);
  if (bearerToken) {
    return verifyFirebaseIdToken(bearerToken);
  }

  const sessionToken = getSessionTokenFromCookie(request);
  if (!sessionToken) {
    throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);
  }

  return verifyFirebaseSessionCookie(sessionToken);
}

export {
  SESSION_COOKIE_NAME,
  getBearerToken,
  requireAuthenticatedRequest,
  verifyFirebaseIdToken,
  verifyFirebaseSessionCookie,
  verifyIdToken,
  verifySessionCookie,
  verifyAuthToken,
};
