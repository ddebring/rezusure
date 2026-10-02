import { z } from "zod";

const serverEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1).optional(),
    FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
    FIREBASE_ADMIN_STORAGE_BUCKET: z.string().min(1).optional(),
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
    FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).optional(),
    GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(30000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).optional(),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).optional(),
    COUNTRY_DETECTION_MODE: z.enum(["header", "provider", "development"]).default("development"),
    COUNTRY_GEOIP_URL: z.string().url().optional(),
    COUNTRY_GEOIP_API_KEY: z.string().optional(),
    DEV_COUNTRY: z.string().length(2).default("IN"),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    PADDLE_CLIENT_SIDE_TOKEN: z.string().optional(),
    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
    LOG_LEVEL: z.string().default("info"),
  })
  .transform((env) => ({
    ...env,
    FIREBASE_PROJECT_ID: env.FIREBASE_ADMIN_PROJECT_ID ?? env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: env.FIREBASE_ADMIN_CLIENT_EMAIL ?? env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: env.FIREBASE_ADMIN_PRIVATE_KEY ?? env.FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET: env.FIREBASE_ADMIN_STORAGE_BUCKET ?? env.FIREBASE_STORAGE_BUCKET,
  }));

let cached: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (cached) return cached;
  cached = serverEnvSchema.parse(process.env);
  return cached;
}
