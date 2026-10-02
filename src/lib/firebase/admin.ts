import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

import {
  getStorage,
  type Storage,
} from "firebase-admin/storage";

import { getServerEnv } from "@/lib/env/server";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const env = getServerEnv();

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;

  // The server environment may provide the private key under several
  // variable names depending on deployment. Use the normalized field
  // from our server env schema and defensively handle escaped newlines.
  const rawPrivateKey = env.FIREBASE_ADMIN_PRIVATE_KEY ?? env.FIREBASE_PRIVATE_KEY ?? "";

  const privateKey = rawPrivateKey
    ? rawPrivateKey.replace(/\\n/g, "\n")
    : "";

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is missing.",
    );
  }

  if (!clientEmail) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL is missing.",
    );
  }

  if (!privateKey) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is missing.",
    );
  }

  console.log("[Firebase Admin] Initializing:", {
    projectId,
    clientEmail,
  });

  const appConfig: { credential: ReturnType<typeof cert>; storageBucket?: string } = {
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  };

  if (env.FIREBASE_STORAGE_BUCKET) {
    appConfig.storageBucket = env.FIREBASE_STORAGE_BUCKET;
  }

  if (appConfig.storageBucket) {
    console.log("[Firebase Admin] initializing with storage bucket:", appConfig.storageBucket);
  } else {
    console.log("[Firebase Admin] initializing without explicit storage bucket; will use default project bucket if available.");
  }

  adminApp = initializeApp(appConfig);

  return adminApp;
}

/**
 * Firebase Authentication Admin SDK
 */
export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Cloud Firestore Admin SDK
 *
 * Rezusure uses the named Firestore database:
 * "rezusure"
 */
export function adminDb(): Firestore {
  return getFirestore(
    getAdminApp(),
    "rezusure",
  );
}

/**
 * Firebase Storage Admin SDK
 */
export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}

/**
 * Expose the initialized Firebase Admin app.
 */
export { getAdminApp };