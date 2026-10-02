import { NextResponse } from "next/server";
import { getAnalysisPackById } from "@/config/analysis-packs";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/razorpay";
import { grantPurchaseCredits } from "@/lib/billing/usage";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            notes?: { uid?: string; packageId?: string };
            amount?: number;
            currency?: string;
            status?: string;
          };
        };
      };
    };

    const eventName = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity || !paymentEntity.id || !paymentEntity.order_id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (eventName !== "payment.captured" && eventName !== "payment.authorized" && eventName !== "order.paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const packageId = paymentEntity.notes?.packageId;
    const uid = paymentEntity.notes?.uid;

    if (!uid || !packageId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const pack = getAnalysisPackById(packageId);

    if (paymentEntity.status && paymentEntity.status !== "captured" && paymentEntity.status !== "authorized") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await grantPurchaseCredits(uid, pack.id, {
      orderId: paymentEntity.order_id,
      paymentId: paymentEntity.id,
      amountMinor: Number(paymentEntity.amount ?? pack.amountMinor),
      currency: paymentEntity.currency ?? pack.currency,
    });

    return NextResponse.json({ ok: true, granted: pack.credits });
  } catch (error) {
    console.error("[billing-webhook] error:", error);
    return NextResponse.json({ ok: false, error: "Webhook processing failed." }, { status: 500 });
  }
}
