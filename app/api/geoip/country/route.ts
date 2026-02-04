import "server-only";

import { NextResponse } from "next/server";
import { lookupCountryCodeFromIp } from "@/lib/server/geoip/ip-to-country";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  const ip = (body as { ip?: unknown } | null)?.ip;
  if (!isNonEmptyString(ip)) {
    return NextResponse.json({ error: "ip 不能为空" }, { status: 400 });
  }

  const countryCode = await lookupCountryCodeFromIp(ip);
  return NextResponse.json({ countryCode });
}

