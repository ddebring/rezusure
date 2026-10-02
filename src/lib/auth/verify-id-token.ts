import type { DecodedIdToken } from "firebase-admin/auth";

import { AppError } from "@/domain/common/result";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Extract a Bearer token from an Authorization header.
 *
 * Expected:
 * Authorization: Bearer <Firebase ID token>
 */
export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

/**
 * Convert Firebase authentication errors into application errors.
 */
function mapAuthError(error: unknown): AppError {
  const firebaseError = error as {
    code?: string;
    message?: string;
  };

  const code = firebaseError?.code ?? "";

  if (
    code.includes("auth/id-token-expired") ||
    code.includes("auth/session-cookie-expired")
  ) {
    return new AppError(
      "Your session has expired. Please sign in again.",
      "AUTH_EXPIRED",
      401,
    );
  }

  if (
    code.includes("auth/id-token-revoked") ||
    code.includes("auth/session-cookie-revoked")
  ) {
    return new AppError(
      "Your session is no longer valid. Please sign in again.",
      "AUTH_REVOKED",
      401,
    );
  }

  if (
    code.includes("auth/argument-error") ||
    code.includes("auth/invalid-id-token") ||
    code.includes("auth/invalid-session-cookie")
  ) {
    return new AppError(
      "Invalid authentication credentials.",
      "AUTH_INVALID",
      401,
    );
  }

  return new AppError(
    "Authentication failed.",
    "AUTH_FAILED",
    401,
  );
}

/**
 * Verify a Firebase ID token.
 *
 * Use this for:
 * Authorization: Bearer <ID_TOKEN>
 */
export async function verifyFirebaseIdToken(
  token: string,
): Promise<DecodedIdToken> {
  if (!token || !token.trim()) {
    throw new AppError(
      "Authentication required.",
      "AUTH_REQUIRED",
      401,
    );
  }

  try {
    return await adminAuth().verifyIdToken(token, true);
  } catch (error) {
    console.error("[auth] Firebase ID token verification failed:", error);
    throw mapAuthError(error);
  }
}

/**
 * Verify a Firebase session cookie.
 *
 * Use this for:
 * rezusure_session=<SESSION_COOKIE>
 */
export async function verifyFirebaseSessionCookie(
  token: string,
): Promise<DecodedIdToken> {
  if (!token || !token.trim()) {
    throw new AppError(
      "Authentication required.",
      "AUTH_REQUIRED",
      401,
    );
  }

  try {
    return await adminAuth().verifySessionCookie(token, true);
  } catch (error) {
    console.error(
      "[auth] Firebase session cookie verification failed:",
      error,
    );

    throw mapAuthError(error);
  }
}

/**
 * Generic ID-token verification alias.
 */
export async function verifyIdToken(
  token: string,
): Promise<DecodedIdToken> {
  return verifyFirebaseIdToken(token);
}

/**
 * Generic session-cookie verification alias.
 */
export async function verifySessionCookie(
  token: string,
): Promise<DecodedIdToken> {
  return verifyFirebaseSessionCookie(token);
}

/**
 * Verify either:
 *
 * 1. Authorization: Bearer <Firebase ID token>
 * 2. rezusure_session=<Firebase session cookie>
 *
 * This is the preferred helper for API routes.
 */
export async function verifyAuthToken(
  request: Request,
): Promise<DecodedIdToken> {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    return verifyFirebaseIdToken(bearerToken);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  const cookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("rezusure_session="));

  if (!cookie) {
    throw new AppError(
      "Authentication required.",
      "AUTH_REQUIRED",
      401,
    );
  }

  const sessionToken = decodeURIComponent(
    cookie.slice("rezusure_session=".length),
  );

  if (!sessionToken) {
    throw new AppError(
      "Authentication required.",
      "AUTH_REQUIRED",
      401,
    );
  }

  return verifyFirebaseSessionCookie(sessionToken);
}

/**
 * Require an authenticated API request.
 *
 * Kept as a separate helper so existing routes importing
 * requireAuthenticatedRequest continue to work.
 */
export async function requireAuthenticatedRequest(
  request: Request,
): Promise<DecodedIdToken> {
  return verifyAuthToken(request);
}