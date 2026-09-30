# REZUSURE architecture foundation

## 1. Runtime boundary

The application is a standard Next.js App Router application. UI can render through server components and client components, while server work uses `app/api/**/route.ts`. No business-critical operation depends on Netlify Functions.

Deployment targets:

- Localhost: Next.js Node runtime.
- Netlify: Next.js adapter/runtime.
- Vercel: native Next.js runtime.
- Google Cloud Run: containerized Next.js Node runtime.

The only deployment-sensitive input intentionally abstracted is IP-country detection, which is consumed through the `CountryDetector` interface.

## 2. Layering

```text
src/
  app/                    # routing + rendering + route handlers
  components/             # reusable UI and layout
  config/                 # product catalog, plans, country catalog
  domain/                 # provider-agnostic business contracts
  lib/
    ai/                   # OpenAI adapter + validated analysis schema
    auth/                 # trusted token verification
    billing/              # pricing resolution + provider interface
    country/              # country detection + context resolution
    env/                  # server environment validation
    firebase/             # client/admin infrastructure boundaries
    validation/           # API input schemas
```

The UI must not import provider SDKs or read secrets. A payment button asks the billing domain for a resolved checkout context; it does not know whether the provider is Razorpay or Paddle.

## 3. Country and pricing model

There are two distinct concepts:

**Display country** may be explicitly selected by the user and persisted in an `HttpOnly` cookie for later page requests. This lets a visitor view the appropriate pricing region without using browser GPS.

**Payment country** is always resolved from server-side country detection at checkout. The payment route must ignore the display cookie for authorization/provider/currency decisions and re-resolve the trusted country context. This prevents the browser from selecting a provider or currency and then submitting an arbitrary amount.

Current mapping:

| Country | Currency | Region | Provider |
|---|---|---|---|
| IN | INR | India | Razorpay |
| US | USD | International | Paddle |
| Other | USD | International | Paddle |

Additional currencies can be added by extending the country/pricing catalogs, not the UI.

## 4. Billing abstraction

`PaymentProviderAdapter` defines:

- `createCheckout()`
- `verifyWebhook()`

The future production implementations will be `RazorpayPaymentProviderAdapter` and `PaddlePaymentProviderAdapter`.

Provider-specific IDs, secrets, signatures, and webhook payloads stay in the adapters. The rest of the product operates on `Subscription`, `Payment`, `Plan`, `PlanPrice`, and entitlement concepts.

## 5. AI abstraction

`AIResumeAnalyzer` is the application interface. `OpenAIResumeAnalyzer` is the first adapter. Model output must pass `ResumeAnalysisSchema` before persistence. The database stores the validated business object plus model/schema metadata, not an unbounded raw response.

The next milestone can add a different model/provider without changing the analysis page or Firestore model.

## 6. Authentication model

The browser will use Firebase Authentication to establish identity. API requests will send a Firebase ID token. Trusted Next.js route handlers will validate the token with Firebase Admin SDK.

Client-submitted `ownerId`, subscription status, usage counters, pricing amount, or payment status are not trusted.

## 7. Firestore ownership model

User-owned documents are keyed or filtered by `ownerId`. Client reads are limited by Firestore rules. Privileged writes for resumes, analyses, subscriptions, payments, usage, and webhook events are server-only.

The Admin SDK bypasses Firestore security rules by design, so server handlers must perform their own ownership and authorization checks before using Admin operations.

## 8. Resume storage model

Original uploads belong under:

```text
users/{uid}/resumes/{generated-file-id}
```

Storage rules constrain reads/writes to the owning UID and validate allowed MIME types and a 5 MiB maximum. Server-side upload validation will independently validate the extension, MIME type, size, and parsing result.

## 9. Error handling

Expected application errors use `AppError` with a stable error code and HTTP status. Route handlers should convert these to JSON responses without leaking stack traces or provider credentials.

## 10. SEO

Public pages use route metadata plus `robots.ts` and `sitemap.ts`. Authenticated pages and APIs are excluded from indexing.
