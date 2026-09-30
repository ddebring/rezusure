# REZUSURE

AI-powered resume and career optimization SaaS.

## Foundation status

This repository is the foundation milestone only. It includes the Next.js application shell, typed domain model, pricing/billing abstraction, AI abstraction, country context abstraction, Firebase client/admin boundaries, Firestore rules/indexes, reusable UI primitives, public route shells, authenticated app route shells, and SEO files.

External integrations are intentionally not wired as fake implementations. The next milestone will implement authentication and session verification, followed by secure resume upload/parsing, AI analysis, and then billing.

## Architecture

- **Next.js App Router**: UI, server components, and portable `app/api/**/route.ts` handlers.
- **Domain layer** (`src/domain`): provider-agnostic business types.
- **Infrastructure layer** (`src/lib`): Firebase, OpenAI, geolocation, validation, and billing adapters.
- **Config layer** (`src/config`): product and pricing configuration.
- **UI layer** (`src/components`): reusable primitives and application shells.

### Portability rule

Business logic must not depend on Netlify APIs. Hosting-specific headers are handled behind the country detector adapter, and all application APIs live in standard Next.js Route Handlers.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and populate the required values.
3. Start the app with `npm run dev`.
4. Run `npm run typecheck` and `npm run lint` before committing.

Firebase emulator support will be added with the authentication/data milestone.

## Planned implementation order

1. Authentication + Firebase user bootstrap.
2. Secure resume upload and storage metadata.
3. Resume parsing and normalized resume model.
4. OpenAI structured analysis + schema validation.
5. Dashboard/history and usage enforcement.
6. Razorpay adapter + webhook idempotency.
7. Paddle adapter + webhook idempotency.
8. Subscription entitlements and production hardening.
