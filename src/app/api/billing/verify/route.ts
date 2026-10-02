import { NextResponse } from "next/server";

import { getAnalysisPackById } from "@/config/analysis-packs";
import { verifyBearerToken } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { grantPurchaseCredits } from "@/lib/billing/usage";
import { verifyRazorpaySignature } from "@/lib/billing/razorpay";
import { getServerEnv } from "@/lib/env/server";

export async function POST(request: Request) {
  try {
    /*
     * Authenticate the request.
     *
     * Supports:
     * 1. Authorization: Bearer <Firebase ID token>
     * 2. rezusure_session=<Firebase session cookie>
     */
    const decoded = await verifyBearerToken(request);

    const body = await request.json().catch(() => ({}));

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId
        : null;

    const paymentId =
      typeof body.paymentId === "string"
        ? body.paymentId
        : null;

    const signature =
      typeof body.signature === "string"
        ? body.signature
        : null;

    const packageId =
      typeof body.packageId === "string"
        ? body.packageId
        : null;

    /*
     * Validate the payment verification payload.
     */
    if (
      !orderId ||
      !paymentId ||
      !signature ||
      !packageId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing payment verification details.",
        },
        { status: 400 },
      );
    }

    /*
     * Verify the Razorpay signature first.
     */
    const isValidSignature =
      verifyRazorpaySignature({
        orderId,
        paymentId,
        signature,
      });

    if (!isValidSignature) {
      return NextResponse.json(
        {
          error:
            "Payment verification failed.",
        },
        { status: 400 },
      );
    }

    /*
     * Resolve the purchased analysis pack.
     */
    const pack =
      getAnalysisPackById(packageId);

    const db = adminDb();

    /*
     * Purchases are scoped to the authenticated user.
     */
    const purchaseRef = db
      .collection("users")
      .doc(decoded.uid)
      .collection("purchases")
      .doc(orderId);

    const purchaseSnapshot =
      await purchaseRef.get();

    /*
     * Idempotency:
     *
     * If this Razorpay order has already been
     * processed successfully, don't grant credits again.
     */
    if (
      purchaseSnapshot.exists &&
      purchaseSnapshot.data()?.status === "paid"
    ) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        message: `Payment already processed. ${pack.credits} analyses are available in your account.`,
        creditsGranted: pack.credits,
      });
    }

    /*
     * Retrieve server-side Razorpay credentials.
     */
    const env = getServerEnv();

    /*
     * Confirm the payment directly with Razorpay.
     *
     * This is intentionally performed server-side rather
     * than trusting the client-side payment response.
     */
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Basic ${Buffer.from(
              `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
            ).toString("base64")}`,

          Accept: "application/json",
        },

        cache: "no-store",
      },
    );

    const paymentPayload =
      await paymentResponse
        .json()
        .catch(() => null);

    if (
      !paymentResponse.ok ||
      !paymentPayload
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to confirm payment with Razorpay.",
        },
        { status: 502 },
      );
    }

    /*
     * Make sure the payment belongs to the
     * Razorpay order we are processing.
     */
    if (
      paymentPayload.order_id !== orderId
    ) {
      return NextResponse.json(
        {
          error:
            "Payment order mismatch.",
        },
        { status: 400 },
      );
    }

    /*
     * Razorpay payment must have reached a
     * confirmed state before credits are granted.
     */
    if (
      paymentPayload.status !== "captured" &&
      paymentPayload.status !== "authorized"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is not yet confirmed.",
        },
        { status: 402 },
      );
    }

    /*
     * Persist the successful purchase.
     */
    const now = new Date();

    await purchaseRef.set(
      {
        userId: decoded.uid,

        packageId: pack.id,

        creditsGranted:
          pack.credits,

        amountMinor:
          pack.amountMinor,

        currency:
          pack.currency,

        provider: "razorpay",

        razorpayOrderId:
          orderId,

        razorpayPaymentId:
          paymentId,

        razorpaySignature:
          signature,

        status: "paid",

        createdAt: now,
        updatedAt: now,
      },
      {
        merge: true,
      },
    );

    /*
     * Grant the purchased credits.
     */
    const usage =
      await grantPurchaseCredits(
        decoded.uid,
        pack.id,
        {
          orderId,
          paymentId,
          amountMinor:
            pack.amountMinor,
          currency:
            pack.currency,
          signature,
        },
      );

    return NextResponse.json({
      ok: true,

      message:
        `Payment successful. ${pack.credits} analyses were added to your account.`,

      creditsGranted:
        pack.credits,

      freeAnalysesRemaining:
        usage.freeAnalysesRemaining,

      paidCredits:
        usage.paidCredits,
    });
  } catch (error) {
    console.error(
      "[billing-verify] error:",
      error,
    );

    /*
     * Preserve structured authentication errors
     * such as AUTH_REQUIRED / AUTH_EXPIRED /
     * AUTH_INVALID.
     */
    if (
      error instanceof Error &&
      "status" in error
    ) {
      const appError =
        error as Error & {
          status?: number;
          code?: string;
        };

      return NextResponse.json(
        {
          error:
            appError.message ??
            "Unable to verify the payment.",

          code:
            appError.code ??
            "AUTH_FAILED",
        },
        {
          status:
            appError.status ??
            500,
        },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify the payment.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}