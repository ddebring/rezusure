import { NextResponse } from "next/server";
import { countryOverrideSchema } from "@/lib/validation/api";
import { COUNTRY_COOKIE } from "@/lib/country/detector";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = countryOverrideSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid country code." }, { status: 400 });

  const response = NextResponse.json({ ok: true, countryCode: parsed.data.countryCode });
  response.cookies.set(COUNTRY_COOKIE, parsed.data.countryCode, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  return response;
}
