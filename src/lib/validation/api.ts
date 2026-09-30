import { z } from "zod";

export const countryCodeSchema = z.string().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase());
export const planIdSchema = z.enum(["free", "pro", "career"]);

export const countryOverrideSchema = z.object({ countryCode: countryCodeSchema });
