import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";
import type { AppUser } from "@/lib/auth/types";

export async function getCurrentFirebaseIdToken(
  forceRefresh = false,
): Promise<string | null> {
  const user = firebaseAuth?.currentUser;

  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("[AUTH] Failed to resolve Firebase ID token:", error);
    return null;
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { retryOnExpiredToken?: boolean; forceRefresh?: boolean } = {},
): Promise<Response> {
  const { retryOnExpiredToken = true, forceRefresh = true } = options;
  const user = firebaseAuth?.currentUser;

  if (!user) {
    throw new Error("Authentication required.");
  }

  const token = await getCurrentFirebaseIdToken(forceRefresh);

  if (!token) {
    throw new Error("Unable to refresh the current Firebase session.");
  }

  const requestInit: RequestInit = {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(input, requestInit);

  if (!retryOnExpiredToken || response.status !== 401) {
    return response;
  }

  const payload = await response.clone().json().catch(() => null);
  const shouldRetry =
    payload && (
      payload.code === "AUTH_INVALID" ||
      payload.code === "AUTH_EXPIRED" ||
      (typeof payload.error === "string" &&
        /(expired|invalid or expired)/i.test(payload.error))
    );

  if (!shouldRetry) {
    return response;
  }

  const refreshedToken = await getCurrentFirebaseIdToken(true);

  if (!refreshedToken || refreshedToken === token) {
    return response;
  }

  return fetch(input, {
    ...requestInit,
    headers: {
      ...(requestInit.headers ?? {}),
      Authorization: `Bearer ${refreshedToken}`,
    },
  });
}

/**
 * Convert Firebase's User object into our application user object.
 */
export function toAppUser(user: User | null): AppUser | null {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    provider: user.providerData[0]?.providerId ?? "password",
  };
}

/**
 * Establish the application session after Firebase authentication.
 */
export async function bootstrapSession(user: User): Promise<void> {
  if (!user) {
    throw new Error("No authenticated Firebase user.");
  }

  const token = await getCurrentFirebaseIdToken(true);

  if (!token) {
    throw new Error("Unable to refresh the current Firebase session.");
  }

  const response = await fetch("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("[AUTH] Session bootstrap failed:", {
      status: response.status,
      payload,
    });

    throw new Error(
      payload?.error ??
        `Session bootstrap failed with HTTP ${response.status}.`,
    );
  }
}

/**
 * Login using email/password.
 */
export async function loginWithEmailClient(
  email: string,
  password: string,
): Promise<AppUser> {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured yet. Add your web app credentials to .env.local.",
    );
  }

  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );

  await bootstrapSession(credential.user);

  return toAppUser(credential.user) as AppUser;
}

/**
 * Create a new account using email/password.
 */
export async function signupWithEmailClient(
  email: string,
  password: string,
): Promise<AppUser> {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured yet. Add your web app credentials to .env.local.",
    );
  }

  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );

  await bootstrapSession(credential.user);

  return toAppUser(credential.user) as AppUser;
}

/**
 * Login using Google.
 */
export async function loginWithGoogleClient(): Promise<AppUser> {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured yet. Add your web app credentials to .env.local.",
    );
  }

  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  const credential = await signInWithPopup(firebaseAuth, provider);

  await bootstrapSession(credential.user);

  return toAppUser(credential.user) as AppUser;
}

/**
 * Logout from both:
 *
 * 1. Our Next.js server session
 * 2. Firebase client authentication
 */
export async function logoutClient(): Promise<void> {
  console.log("[AUTH] Starting logout...");

  // First sign out of Firebase on the client. This will trigger
  // `onAuthStateChanged` subscribers (including AuthProvider).
  if (firebaseAuth) {
    try {
      console.log("[AUTH] Calling firebase signOut...");
      await signOut(firebaseAuth);
      console.log("[AUTH] Firebase logout successful.");
    } catch (error) {
      console.error("[AUTH] Firebase logout failed:", error);
      // proceed to attempt server-side logout even if client signOut fails
    }
  } else {
    console.warn("[AUTH] firebaseAuth is not initialized during logout.");
  }

  // Then attempt to remove the server session cookie.
  let serverCleared = false;
  try {
    console.log("[AUTH] Calling POST /api/auth/logout...");
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    console.log("[AUTH] Logout API response:", {
      status: response.status,
      payload,
    });

    serverCleared = response.ok;

    if (!response.ok) {
      console.error("[AUTH] Logout API failed:", payload);
    }
  } catch (error) {
    console.error("[AUTH] Logout API request failed:", error);
  }

  console.log("[AUTH] Logout complete. serverCleared=", serverCleared);

  console.log("[AUTH] Logout complete.");
}

/**
 * Convert Firebase authentication errors into user-friendly messages.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unable to complete the request right now. Please try again.";
  }

  const code =
    "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";

    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "The email or password is incorrect.";

    case "auth/email-already-in-use":
      return "An account with that email address already exists.";

    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";

    case "auth/network-request-failed":
      return "Network connection failed. Please check your connection and try again.";

    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";

    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Please allow popups and try again.";

    case "auth/cancelled-popup-request":
      return "The Google sign-in request was cancelled.";

    default:
      console.error("[AUTH] Unhandled Firebase error:", error);
      return "Something went wrong. Please try again.";
  }
}