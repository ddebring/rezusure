import { adminDb } from "@/lib/firebase/admin";

type BootstrapUserInput = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider?: string;
};

export async function bootstrapUserProfile({
  uid,
  email,
  displayName,
  photoURL,
}: BootstrapUserInput) {
  const db = adminDb();

  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  const now = new Date();

  if (!snapshot.exists) {
    const profile = {
      uid,
      email: email ?? null,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      totalAnalysesUsed: 0,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(profile);
    return profile;
  }

  const existing = snapshot.data() ?? {};
  const nextProfile = {
    uid,
    email: email ?? existing.email ?? null,
    displayName: displayName ?? existing.displayName ?? null,
    photoURL: photoURL ?? existing.photoURL ?? null,
    freeAnalysesRemaining:
      typeof existing.freeAnalysesRemaining === "number"
        ? existing.freeAnalysesRemaining
        : 1,
    paidCredits:
      typeof existing.paidCredits === "number"
        ? existing.paidCredits
        : 0,
    totalAnalysesUsed:
      typeof existing.totalAnalysesUsed === "number"
        ? existing.totalAnalysesUsed
        : 0,
  };

  const hasMeaningfulChanges =
    existing.email !== nextProfile.email ||
    existing.displayName !== nextProfile.displayName ||
    existing.photoURL !== nextProfile.photoURL ||
    existing.freeAnalysesRemaining !== nextProfile.freeAnalysesRemaining ||
    existing.paidCredits !== nextProfile.paidCredits ||
    existing.totalAnalysesUsed !== nextProfile.totalAnalysesUsed ||
    existing.uid !== uid;

  if (!hasMeaningfulChanges) {
    return {
      ...existing,
      ...nextProfile,
      updatedAt: existing.updatedAt ?? now,
    };
  }

  await ref.set(
    {
      ...nextProfile,
      updatedAt: now,
    },
    { merge: true },
  );

  return {
    ...existing,
    ...nextProfile,
    updatedAt: now,
  };
}