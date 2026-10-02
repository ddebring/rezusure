import { NextResponse } from "next/server";

import { getAnalysisPackById } from "@/config/analysis-packs";
import { verifyBearerToken } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { createRazorpayOrder } from "@/lib/billing/razorpay";

export async function POST(request: Request) {
  try {
    /*
     * Authenticate the request.
     *
     * Supports:
     * 1. Authorization: Bearer <Firebase ID token>
     * 2. rezusure_session=<Firebase session cookie>
     */
    const decoded =
      await verifyBearerToken(request);

    const body =
      await request.json().catch(
        () => ({}),
      );

    const packageId =
      typeof body.packageId === "string"
        ? body.packageId
        : null;

    /*
     * Validate the requested analysis pack.
     */
    if (!packageId) {
      return NextResponse.json(
        {
          error:
            "A valid analysis pack is required.",
        },
        { status: 400 },
      );
    }

    /*
     * Resolve the pack from the server-side
     * configuration.
     *
     * The client does not control the amount,
     * currency, or credit count.
     */
    const pack =
      getAnalysisPackById(packageId);

    /*
     * Create the Razorpay order using the
     * authenticated Firebase UID.
     */
    const order =
      await createRazorpayOrder({
        uid: decoded.uid,
        packageId: pack.id,
      });

    const db = adminDb();

    /*
     * Store the pending purchase under
     *
     * users/{uid}/purchases/{razorpayOrderId}
     */
    const purchaseRef = db
      .collection("users")
      .doc(decoded.uid)
      .collection("purchases")
      .doc(order.orderId);

    const now = new Date();

    await purchaseRef.set(
      {
        userId:
          decoded.uid,

        packageId:
          pack.id,

        creditsGranted:
          pack.credits,

        amountMinor:
          pack.amountMinor,

        currency:
          pack.currency,

        provider:
          "razorpay",

        razorpayOrderId:
          order.orderId,

        status:
          "pending",

        createdAt:
          now,

        updatedAt:
          now,
      },
      {
        merge: true,
      },
    );

    /*
     * Return only the information the client
     * needs to initialize Razorpay Checkout.
     */
    return NextResponse.json({
      ok: true,

      packageId:
        pack.id,

      orderId:
        order.orderId,

      amountMinor:
        order.amountMinor,

      currency:
        order.currency,

      keyId:
        order.keyId,

      credits:
        pack.credits,

      displayAmount:
        `₹${pack.amountMinor / 100}`,
    });
  } catch (error) {
    console.error(
      "[billing-checkout] error:",
      error,
    );

    /*
     * Preserve structured authentication
     * errors rather than converting them into
     * generic HTTP 500 responses.
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
            "Unable to create the purchase order.",

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
        : "Unable to create the purchase order.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}