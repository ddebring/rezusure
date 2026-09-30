import { NextResponse } from "next/server";
import { resolveCountry } from "@/lib/country/detector";

export async function GET(request: Request) {
  const context = await resolveCountry(request);
  return NextResponse.json(context, { headers: { "cache-control": "private, no-store" } });
}
