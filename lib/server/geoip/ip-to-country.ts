import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import * as mmdb from "mmdb-lib";

type IpToCountryRecord = {
  country_code?: string;
  countryCode?: string;
  country?: string;
  country_name?: string;
  countryName?: string;
};

let readerPromise: Promise<mmdb.Reader<any>> | null = null;
const cache = new Map<string, string | null>();

async function getReader(): Promise<mmdb.Reader<any>> {
  if (readerPromise) return readerPromise;

  readerPromise = (async () => {
    const dbPath = path.join(
      process.cwd(),
      "public",
      "geoip",
      "ip-to-country.mmdb",
    );
    const buf = await fs.readFile(dbPath);
    return new mmdb.Reader<any>(buf);
  })();

  return readerPromise;
}

export async function lookupCountryCodeFromIp(
  ip: string,
): Promise<string | null> {
  const normalized = ip.trim();
  if (!normalized) return null;

  const cached = cache.get(normalized);
  if (cached !== undefined) return cached;

  try {
    const reader = await getReader();
    const record = reader.get(normalized) as IpToCountryRecord | null;

    const codeCandidate =
      record?.country_code ??
      record?.countryCode ??
      record?.country;

    if (typeof codeCandidate === "string" && codeCandidate.length === 2) {
      const code = codeCandidate.toUpperCase();
      cache.set(normalized, code);
      return code;
    }

    cache.set(normalized, null);
    return null;
  } catch {
    cache.set(normalized, null);
    return null;
  }
}
