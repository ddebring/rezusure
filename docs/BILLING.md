# Rezusure billing and usage model

## Core model

Rezusure uses a one-time usage-credit model rather than recurring subscriptions.

A user profile stores the server-authoritative usage state in Firestore:

- `freeAnalysesRemaining` — starts at 1 for new users
- `paidCredits` — purchased analysis credits
- `totalAnalysesUsed` — total analysis attempts that were successfully consumed

Initial state for a new user:

```json
{
  "freeAnalysesRemaining": 1,
  "paidCredits": 0,
  "totalAnalysesUsed": 0
}
```

## Analysis credit rules

Every successful analysis consumes exactly one credit.

Priority is enforced server-side:

1. Use one free analysis if available.
2. Otherwise consume one paid credit.
3. Otherwise reject the request with `ANALYSIS_CREDITS_EXHAUSTED`.

Credits are consumed only after the resume analysis is successfully persisted.

## Package model

Package definitions are centralized in `src/config/analysis-packs.ts`.

- `pack_10` → 10 analyses → ₹299.00
- `pack_25` → 25 analyses → ₹499.00
- `pack_50` → 50 analyses → ₹699.00

Amounts are stored as minor units (`amountMinor`) to avoid floating-point errors.

## Firestore model

The authoritative user profile remains in `users/{uid}`.

Additional purchase records are stored under:

- `users/{uid}/purchases/{purchaseId}`
- `users/{uid}/credit-ledger/{eventId}`

This keeps the model simple while still providing a clear audit trail.

## Razorpay integration

Razorpay is configured in TEST mode by default.

Server-side requirements:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

The browser never receives the secret key.

### Payment flow

1. User selects a package on the billing page.
2. Server creates a Razorpay order.
3. Browser opens Razorpay Checkout.
4. Server verifies the Razorpay signature.
5. Server validates payment status.
6. Server grants credits with an idempotent transaction.

## Webhooks

A Razorpay webhook endpoint is implemented at `/api/billing/webhook`.

Webhook processing:

- verifies the webhook signature
- ignores untrusted events
- records credit grants only once per payment/order id
- prevents duplicate credit granting using Firestore transaction state

## Testing

Use Razorpay TEST keys and the test checkout flow to validate:

- single free analysis
- exhausted analysis flow
- package purchase flow
- credit grant flow
- payment verification path
- duplicate callback safety

## Going live later

When production is ready, switch the keys and webhook secret to the live Razorpay values and keep the same flow.
