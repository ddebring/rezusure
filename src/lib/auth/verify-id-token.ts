import type { DecodedIdToken } from "firebase-admin/auth";
import { AppError } from "@/domain/common/result";
import { adminAuth } from "@/lib/firebase/admin";

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

function mapAuthError(error: unknown): AppError {
  const firebaseError = error as {
    code?: string;
    message?: string;
  };

  console.error("Firebase Admin auth verification error:", error);
  console.error("Firebase Admin error code:", firebaseError?.code);
  console.error("Firebase Admin error message:", firebaseError?.message);

  const isExpired =
    firebaseError?.code === "auth/id-token-expired" ||
    firebaseError?.code === "auth/session-cookie-expired" ||
    /expired/i.test(firebaseError?.message ?? "");

  return new AppError(
    firebaseError?.message ?? "Invalid or expired authentication token.",
    isExpired ? "AUTH_EXPIRED" : "AUTH_INVALID",
    401,
  );
}

export async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken> {
  if (!token) {
    throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);
  }

  try {
    return await adminAuth().verifyIdToken(token);
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function verifyFirebaseSessionCookie(token: string): Promise<DecodedIdToken> {
  if (!token) {
    throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);
  }

  try {
    return await adminAuth().verifySessionCookie(token, true);
  } catch (error) {
    throw mapAuthError(error);
  }
}

export type TokenVerificationKind = "id-token" | "session-cookie";

export async function verifyAuthToken(
  token: string,
  kind: TokenVerificationKind = "id-token",
): Promise<DecodedIdToken> {
  if (kind === "session-cookie") {
    return verifyFirebaseSessionCookie(token);
  }

  return verifyFirebaseIdToken(token);
}

export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  return verifyAuthToken(token, "id-token");
}

export async function verifySessionCookie(token: string): Promise<DecodedIdToken> {
  return verifyAuthToken(token, "session-cookie");
}

export async function requireAuthenticatedRequest(request: Request): Promise<DecodedIdToken> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);
  }

  return verifyFirebaseIdToken(token);
}