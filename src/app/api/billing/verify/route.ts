import { NextResponse } from "next/server";
import { getAnalysisPackById } from "@/config/analysis-packs";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";
import { grantPurchaseCredits } from "@/lib/billing/usage";
import { verifyRazorpaySignature } from "@/lib/billing/razorpay";
import { getServerEnv } from "@/lib/env/server";

function getSessionToken(request: Request): string | null {
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

export async function POST(request: Request) {
  try {
    const token = getSessionToken(request);

    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const decoded = await verifyFirebaseSessionCookie(token);
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const signature = typeof body.signature === "string" ? body.signature : null;
    const packageId = typeof body.packageId === "string" ? body.packageId : null;

    if (!orderId || !paymentId || !signature || !packageId) {
      return NextResponse.json({ error: "Missing payment verification details." }, { status: 400 });
    }

    const isValidSignature = verifyRazorpaySignature({ orderId, paymentId, signature });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const pack = getAnalysisPackById(packageId);
    const db = adminDb();
    const purchaseRef = db.collection("users").doc(decoded.uid).collection("purchases").doc(orderId);
    const purchaseSnapshot = await purchaseRef.get();

    if (purchaseSnapshot.exists && purchaseSnapshot.data()?.status === "paid") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        message: `Payment already processed. ${pack.credits} analyses are available in your account.`,
        creditsGranted: pack.credits,
      });
    }

    const env = getServerEnv();
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    const paymentPayload = await paymentResponse.json().catch(() => null);

    if (!paymentResponse.ok || !paymentPayload) {
      return NextResponse.json({ error: "Unable to confirm payment with Razorpay." }, { status: 502 });
    }

    if (paymentPayload.order_id !== orderId) {
      return NextResponse.json({ error: "Payment order mismatch." }, { status: 400 });
    }

    if (paymentPayload.status !== "captured" && paymentPayload.status !== "authorized") {
      return NextResponse.json({ error: "Payment is not yet confirmed." }, { status: 402 });
    }

    await purchaseRef.set(
      {
        userId: decoded.uid,
        packageId: pack.id,
        creditsGranted: pack.credits,
        amountMinor: pack.amountMinor,
        currency: pack.currency,
        provider: "razorpay",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: "paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const usage = await grantPurchaseCredits(decoded.uid, pack.id, {
      orderId,
      paymentId,
      amountMinor: pack.amountMinor,
      currency: pack.currency,
      signature,
    });

    return NextResponse.json({
      ok: true,
      message: `Payment successful. ${pack.credits} analyses were added to your account.`,
      creditsGranted: pack.credits,
      freeAnalysesRemaining: usage.freeAnalysesRemaining,
      paidCredits: usage.paidCredits,
    });
  } catch (error) {
    console.error("[billing-verify] error:", error);
    const message = error instanceof Error ? error.message : "Unable to verify the payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
