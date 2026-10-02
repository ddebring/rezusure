import { adminDb } from "@/lib/firebase/admin";
import { AppError } from "@/domain/common/result";
import { DEFAULT_USAGE, getAnalysisPackById, type AnalysisPackId } from "@/config/analysis-packs";

export type UserUsageState = {
  freeAnalysesRemaining: number;
  paidCredits: number;
  totalAnalysesUsed: number;
  updatedAt: Date | null;
};

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return fallback;
}

export function normalizeUserUsage(data?: Record<string, unknown>): UserUsageState {
  const record = data ?? {};

  return {
    freeAnalysesRemaining: normalizeNumber(record.freeAnalysesRemaining, DEFAULT_USAGE.freeAnalysesRemaining),
    paidCredits: normalizeNumber(record.paidCredits, DEFAULT_USAGE.paidCredits),
    totalAnalysesUsed: normalizeNumber(record.totalAnalysesUsed, DEFAULT_USAGE.totalAnalysesUsed),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt : null,
  };
}

export async function getUserUsage(uid: string): Promise<UserUsageState> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    const defaultUsage = normalizeUserUsage(DEFAULT_USAGE as Record<string, unknown>);
    await userRef.set({
      ...defaultUsage,
      uid,
      updatedAt: new Date(),
    }, { merge: true });
    return defaultUsage;
  }

  const normalized = normalizeUserUsage(snapshot.data() as Record<string, unknown> | undefined);

  if (
    normalized.freeAnalysesRemaining === DEFAULT_USAGE.freeAnalysesRemaining &&
    normalized.paidCredits === DEFAULT_USAGE.paidCredits &&
    normalized.totalAnalysesUsed === DEFAULT_USAGE.totalAnalysesUsed &&
    !snapshot.data()?.freeAnalysesRemaining &&
    !snapshot.data()?.paidCredits &&
    !snapshot.data()?.totalAnalysesUsed
  ) {
    const defaultUsage = normalizeUserUsage(DEFAULT_USAGE as Record<string, unknown>);
    await userRef.set({
      ...snapshot.data(),
      freeAnalysesRemaining: defaultUsage.freeAnalysesRemaining,
      paidCredits: defaultUsage.paidCredits,
      totalAnalysesUsed: defaultUsage.totalAnalysesUsed,
      updatedAt: new Date(),
    }, { merge: true });
    return defaultUsage;
  }

  return normalized;
}

export async function getAvailableAnalysisCredits(uid: string): Promise<number> {
  const usage = await getUserUsage(uid);
  return usage.freeAnalysesRemaining + usage.paidCredits;
}

export async function reserveAnalysisCredit(uid: string, analysisKey: string): Promise<UserUsageState> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const ledgerRef = userRef.collection("credit-ledger").doc(`analysis:${analysisKey}`);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const usage = normalizeUserUsage(userSnapshot.data() as Record<string, unknown> | undefined);
    const ledgerSnapshot = await transaction.get(ledgerRef);
    const existingState = ledgerSnapshot.data();

    if (existingState?.state === "reserved" || existingState?.state === "consumed") {
      return usage;
    }

    if (usage.freeAnalysesRemaining === 0 && usage.paidCredits === 0) {
      throw new AppError(
        "You have used all available analyses.",
        "ANALYSIS_CREDITS_EXHAUSTED",
        402,
      );
    }

    const source = usage.freeAnalysesRemaining > 0 ? "free" : "paid";
    const updatedUsage = {
      ...usage,
      freeAnalysesRemaining: source === "free" ? usage.freeAnalysesRemaining - 1 : usage.freeAnalysesRemaining,
      paidCredits: source === "paid" ? usage.paidCredits - 1 : usage.paidCredits,
      updatedAt: new Date(),
    };

    transaction.set(
      userRef,
      {
        ...(userSnapshot.data() ?? {}),
        freeAnalysesRemaining: updatedUsage.freeAnalysesRemaining,
        paidCredits: updatedUsage.paidCredits,
        totalAnalysesUsed: updatedUsage.totalAnalysesUsed,
        updatedAt: updatedUsage.updatedAt,
      },
      { merge: true },
    );

    transaction.set(ledgerRef, {
      userId: uid,
      kind: "analysis_reserved",
      state: "reserved",
      source,
      analysisKey,
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      referenceId: analysisKey,
    }, { merge: true });

    return updatedUsage;
  });
}

export async function restoreAnalysisCredit(uid: string, analysisKey: string): Promise<UserUsageState> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const ledgerRef = userRef.collection("credit-ledger").doc(`analysis:${analysisKey}`);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const usage = normalizeUserUsage(userSnapshot.data() as Record<string, unknown> | undefined);
    const ledgerSnapshot = await transaction.get(ledgerRef);
    const ledgerData = ledgerSnapshot.data();

    if (!ledgerSnapshot.exists || ledgerData?.state === "restored" || ledgerData?.state === "consumed") {
      return usage;
    }

    const nextUsage = {
      ...usage,
      freeAnalysesRemaining: ledgerData?.source === "free" ? usage.freeAnalysesRemaining + 1 : usage.freeAnalysesRemaining,
      paidCredits: ledgerData?.source === "paid" ? usage.paidCredits + 1 : usage.paidCredits,
      updatedAt: new Date(),
    };

    transaction.set(
      userRef,
      {
        ...(userSnapshot.data() ?? {}),
        freeAnalysesRemaining: nextUsage.freeAnalysesRemaining,
        paidCredits: nextUsage.paidCredits,
        totalAnalysesUsed: nextUsage.totalAnalysesUsed,
        updatedAt: nextUsage.updatedAt,
      },
      { merge: true },
    );

    transaction.set(
      ledgerRef,
      {
        ...(ledgerData ?? {}),
        kind: "analysis_credit_restored",
        state: "restored",
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return nextUsage;
  });
}

export async function finalizeAnalysisCredit(uid: string, analysisKey: string): Promise<UserUsageState> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const ledgerRef = userRef.collection("credit-ledger").doc(`analysis:${analysisKey}`);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const usage = normalizeUserUsage(userSnapshot.data() as Record<string, unknown> | undefined);
    const ledgerSnapshot = await transaction.get(ledgerRef);
    const ledgerData = ledgerSnapshot.data();

    if (!ledgerSnapshot.exists || ledgerData?.state === "consumed") {
      return usage;
    }

    const updatedUsage = {
      ...usage,
      totalAnalysesUsed: usage.totalAnalysesUsed + 1,
      updatedAt: new Date(),
    };

    transaction.set(
      userRef,
      {
        ...(userSnapshot.data() ?? {}),
        freeAnalysesRemaining: updatedUsage.freeAnalysesRemaining,
        paidCredits: updatedUsage.paidCredits,
        totalAnalysesUsed: updatedUsage.totalAnalysesUsed,
        updatedAt: updatedUsage.updatedAt,
      },
      { merge: true },
    );

    transaction.set(
      ledgerRef,
      {
        ...(ledgerData ?? {}),
        kind: "analysis_consumed",
        state: "consumed",
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return updatedUsage;
  });
}

export async function consumeAnalysisCredit(uid: string, analysisKey: string): Promise<UserUsageState> {
  return finalizeAnalysisCredit(uid, analysisKey);
}

export async function grantPurchaseCredits(
  uid: string,
  packageId: AnalysisPackId,
  purchase: {
    orderId: string;
    paymentId: string;
    amountMinor: number;
    currency: string;
    signature?: string;
  },
): Promise<UserUsageState> {
  const db = adminDb();
  const pack = getAnalysisPackById(packageId);
  const userRef = db.collection("users").doc(uid);
  const purchaseId = purchase.paymentId || purchase.orderId;
  const purchaseRef = userRef.collection("purchases").doc(purchaseId);
  const ledgerRef = userRef.collection("credit-ledger").doc(`purchase:${purchaseId}`);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const usage = normalizeUserUsage(userSnapshot.data() as Record<string, unknown> | undefined);
    const purchaseSnapshot = await transaction.get(purchaseRef);
    const ledgerSnapshot = await transaction.get(ledgerRef);

    if (purchaseSnapshot.exists && purchaseSnapshot.data()?.status === "paid") {
      return usage;
    }

    if (ledgerSnapshot.exists) {
      return usage;
    }

    const updatedUsage = {
      ...usage,
      paidCredits: usage.paidCredits + pack.credits,
      updatedAt: new Date(),
    };

    transaction.set(
      userRef,
      {
        ...(userSnapshot.data() ?? {}),
        freeAnalysesRemaining: updatedUsage.freeAnalysesRemaining,
        paidCredits: updatedUsage.paidCredits,
        totalAnalysesUsed: updatedUsage.totalAnalysesUsed,
        updatedAt: updatedUsage.updatedAt,
      },
      { merge: true },
    );

    transaction.set(purchaseRef, {
      userId: uid,
      packageId: pack.id,
      creditsGranted: pack.credits,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      razorpayOrderId: purchase.orderId,
      razorpayPaymentId: purchase.paymentId,
      razorpaySignature: purchase.signature ?? null,
      provider: "razorpay",
      status: "paid",
      createdAt: new Date(),
      verifiedAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    transaction.set(ledgerRef, {
      kind: "purchase_grant",
      packageId: pack.id,
      creditsGranted: pack.credits,
      createdAt: new Date(),
      source: "razorpay",
    });

    return updatedUsage;
  });
}
