# REZUSURE

AI-powered resume and career optimization SaaS.

## Foundation status

This repository is the foundation milestone only. It includes the Next.js application shell, typed domain model, pricing/billing abstraction, AI abstraction, country context abstraction, Firebase client/admin boundaries, Firestore rules/indexes, reusable UI primitives, public route shells, authenticated app route shells, and SEO files.

External integrations are intentionally not wired as fake implementations. The next milestone will implement authentication and session verification, followed by secure resume upload/parsing, AI analysis, and then billing.

## Architecture

- **Next.js App Router**: UI, server components, and portable `app/api/**/route.ts` handlers.
- **Domain layer** (`src/domain`): provider-agnostic business types.
- **Infrastructure layer** (`src/lib`): Firebase, Gemini, geolocation, validation, and billing adapters.
- **Config layer** (`src/config`): product and pricing configuration.
- **UI layer** (`src/components`): reusable primitives and application shells.

### Portability rule

Business logic must not depend on Netlify APIs. Hosting-specific headers are handled behind the country detector adapter, and all application APIs live in standard Next.js Route Handlers.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and populate the required values.
3. Start the app with `npm run dev`.
4. Run `npm run typecheck` and `npm run lint` before committing.

## Firebase setup

1. Create a Firebase project in the Firebase Console.
2. Open Authentication, then enable Email/Password and, if desired, Google sign-in.
3. Create a Firestore database in production mode or test mode.
4. In Project settings > General > Your apps, register a web app and copy the Firebase configuration values into the `NEXT_PUBLIC_*` variables in `.env.local`.
5. In Project settings > Service accounts, generate a new private key. Use the JSON values to populate `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`.
6. Add the `/users/{uid}` access rules for authenticated ownership-only access in `firestore.rules`.
7. Run `npm run dev`.
8. Create a test account via `/signup`, then confirm that the `users/{uid}` document is created in Firestore.

> Do not commit real Firebase secrets to source control. Keep them in `.env.local` or your hosting secret store.

## Planned implementation order

1. Authentication + Firebase user bootstrap.
2. Secure resume upload and storage metadata.
3. Resume parsing and normalized resume model.
4. Gemini structured analysis + schema validation.
5. Dashboard/history and usage enforcement.
6. Razorpay adapter + webhook idempotency.
7. Paddle adapter + webhook idempotency.
8. Subscription entitlements and production hardening.
