# REZUSURE API surface

All application APIs use standard Next.js Route Handlers.

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Health probe | Public |
| GET | `/api/context` | Resolve display country/pricing context | Public |
| POST | `/api/country` | Set explicit display country | Public |
| POST | `/api/resumes` | Create validated resume upload session/metadata | User |
| GET | `/api/resumes` | List own resumes | User |
| GET | `/api/resumes/:id` | Read own resume | User |
| DELETE | `/api/resumes/:id` | Delete own resume | User |
| POST | `/api/analyses` | Start analysis subject to usage entitlement | User |
| GET | `/api/analyses/:id` | Read own analysis | User |
| POST | `/api/billing/checkout` | Create provider checkout from server-resolved context | User |
| GET | `/api/billing/subscription` | Read current subscription | User |
| POST | `/api/webhooks/razorpay` | Verify and process Razorpay events | Provider signature |
| POST | `/api/webhooks/paddle` | Verify and process Paddle events | Provider signature |

Only the first three routes are currently present in the foundation. The remaining routes are intentionally not stubbed with fake business behavior.
