# REZUSURE security baseline

1. Firebase Authentication establishes the user identity; server routes verify ID tokens using Firebase Admin SDK.
2. Firestore client rules allow users to read only their own user-owned documents. Privileged writes are server-only.
3. Firebase Storage rules scope resume files to the owning UID and constrain MIME type + file size.
4. Gemini and payment secrets are server-only environment variables.
5. Client-submitted `ownerId`, plan amount, currency, provider, subscription status, usage counters, and payment status are never trusted.
6. Display country may be overridden by the user. Checkout re-detects country server-side and ignores the display-country cookie for provider/currency/price decisions.
7. Payment webhooks will be signature-verified and deduplicated through `webhookEvents` before changing subscriptions or payments.
8. AI output passes a strict Zod schema before persistence and rendering.
9. Logs must avoid resume contents, tokens, payment credentials, and unnecessary personal data.
10. Admin SDK use is privileged and must always be preceded by ownership/authorization checks in application code.
