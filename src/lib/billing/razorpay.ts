import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env/server";
import { getAnalysisPackById, type AnalysisPackId } from "@/config/analysis-packs";

export type RazorpayOrderInput = {
  uid: string;
  packageId: AnalysisPackId;
};

export async function createRazorpayOrder({ uid, packageId }: RazorpayOrderInput) {
  const env = getServerEnv();
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your server environment.");
  }

  const pack = getAnalysisPackById(packageId);
  const shortUid = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "user";
  const receipt = `rz_${pack.id}_${shortUid}_${Date.now().toString(36)}`.slice(0, 40);

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: pack.amountMinor,
      currency: pack.currency,
      receipt,
      notes: {
        uid,
        packageId: pack.id,
        source: "rezusure",
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; amount?: number; currency?: string; error?: { description?: string } } | null;

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error?.description ?? "Unable to create the Razorpay order.");
  }

  return {
    orderId: payload.id,
    amountMinor: payload.amount ?? pack.amountMinor,
    currency: payload.currency ?? pack.currency,
    keyId,
    receipt,
  };
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = getServerEnv().RAZORPAY_KEY_SECRET;

  if (!secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function verifyRazorpayWebhookSignature(body: string, signature: string | null) {
  const secret = getServerEnv().RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
