import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
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
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (cached) return cached;
  cached = serverEnvSchema.parse(process.env);
  return cached;
}
