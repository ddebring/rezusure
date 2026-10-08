"use client";

import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  type Analytics,
} from "firebase/analytics";

import firebaseApp from "@/lib/firebase/client";

let analyticsInstance: Analytics | null = null;
let initializationPromise: Promise<Analytics | null> | null = null;

/**
 * Initialize Firebase Analytics in the browser.
 *
 * Analytics is not initialized during SSR.
 * `isSupported()` also prevents initialization in browsers/environments
 * where Firebase Analytics is unavailable.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (!initializationPromise) {
    initializationPromise = isSupported()
      .then((supported) => {
        if (!supported) {
          console.warn(
            "[Rezusure Analytics] Firebase Analytics is not supported in this browser.",
          );

          return null;
        }

        analyticsInstance = getAnalytics(firebaseApp);

        console.info(
          "[Rezusure Analytics] Firebase Analytics initialized.",
        );

        return analyticsInstance;
      })
      .catch((error: unknown) => {
        console.error(
          "[Rezusure Analytics] Failed to initialize Firebase Analytics:",
          error,
        );

        return null;
      });
  }

  return initializationPromise;
}

/**
 * Track a custom Rezusure event.
 *
 * Example:
 *
 * trackEvent("resume_uploaded", {
 *   file_type: "pdf",
 * });
 */
export async function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>,
): Promise<void> {
  const analytics = await getFirebaseAnalytics();

  if (!analytics) {
    return;
  }

  try {
    logEvent(
      analytics,
      eventName,
      parameters as Record<string, string | number | boolean>,
    );
  } catch (error: unknown) {
    console.error(
      `[Rezusure Analytics] Failed to track event "${eventName}":`,
      error,
    );
  }
}

/**
 * Associate Analytics activity with a Firebase Auth user.
 *
 * Use the Firebase UID.
 * Do NOT use the user's email address as the Analytics user ID.
 */
export async function identifyUser(
  userId: string | null,
): Promise<void> {
  if (!userId) {
    return;
  }

  const analytics = await getFirebaseAnalytics();

  if (!analytics) {
    return;
  }

  try {
    setUserId(analytics, userId);

    console.info(
      "[Rezusure Analytics] User identified.",
    );
  } catch (error: unknown) {
    console.error(
      "[Rezusure Analytics] Failed to set user ID:",
      error,
    );
  }
}