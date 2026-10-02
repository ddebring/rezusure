import { NextResponse } from "next/server";
import { getAnalysisPackById } from "@/config/analysis-packs";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";
import { createRazorpayOrder } from "@/lib/billing/razorpay";

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
    const packageId = typeof body.packageId === "string" ? body.packageId : null;

    if (!packageId) {
      return NextResponse.json({ error: "A valid analysis pack is required." }, { status: 400 });
    }

    const pack = getAnalysisPackById(packageId);
    const order = await createRazorpayOrder({ uid: decoded.uid, packageId: pack.id });

    const db = adminDb();
    const purchaseRef = db.collection("users").doc(decoded.uid).collection("purchases").doc(order.orderId);

    await purchaseRef.set(
      {
        userId: decoded.uid,
        packageId: pack.id,
        creditsGranted: pack.credits,
        amountMinor: pack.amountMinor,
        currency: pack.currency,
        provider: "razorpay",
        razorpayOrderId: order.orderId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true,
      packageId: pack.id,
      orderId: order.orderId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      keyId: order.keyId,
      credits: pack.credits,
      displayAmount: `₹${pack.amountMinor / 100}`,
    });
  } catch (error) {
    console.error("[billing-checkout] error:", error);
    const message = error instanceof Error ? error.message : "Unable to create the purchase order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
