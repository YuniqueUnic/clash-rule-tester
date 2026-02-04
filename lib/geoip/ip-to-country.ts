const cache = new Map<string, string | null>();
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_DEPLOYMENT === "true";

type IpToCountryRecord = {
  country_code?: unknown;
  countryCode?: unknown;
  country?: unknown;
};

let readerPromise: Promise<{ get(ip: string): unknown }> | null = null;

async function getBrowserReader(): Promise<{ get(ip: string): unknown }> {
  if (readerPromise) return readerPromise;

  readerPromise = (async () => {
    const [{ Buffer }, mmdb] = await Promise.all([
      import("buffer"),
      import("mmdb-lib"),
    ]);

    if (!("Buffer" in globalThis)) {
      (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
    }

    const response = await fetch("/geoip/ip-to-country.mmdb");
    if (!response.ok) {
      throw new Error(
        `GeoIP 数据库加载失败：HTTP ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    type MmdbReader = { get(ip: string): unknown };
    type MmdbModule = { Reader: new (db: unknown) => MmdbReader };
    const mmdbModule = mmdb as unknown as MmdbModule;
    return new mmdbModule.Reader(buf);
  })();

  return readerPromise;
}

function normalizeCountryCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (trimmed.length !== 2) return null;
  return trimmed.toUpperCase();
}

export async function lookupCountryCodeFromIp(
  ip: string,
): Promise<string | null> {
  const normalizedIp = ip.trim();
  if (!normalizedIp) return null;

  const cached = cache.get(normalizedIp);
  if (cached !== undefined) return cached;

  try {
    if (isStaticExport) {
      const reader = await getBrowserReader();
      const record = reader.get(normalizedIp) as IpToCountryRecord | null;
      const codeCandidate =
        record?.country_code ?? record?.countryCode ?? record?.country;
      const countryCode = normalizeCountryCode(codeCandidate);
      cache.set(normalizedIp, countryCode);
      return countryCode;
    }

    const response = await fetch("/api/geoip/country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: normalizedIp }),
    });

    if (!response.ok) {
      cache.set(normalizedIp, null);
      return null;
    }

    const data = (await response.json().catch(() => null)) as
      | { countryCode?: unknown }
      | null;

    const countryCode = normalizeCountryCode(data?.countryCode);
    cache.set(normalizedIp, countryCode);
    return countryCode;
  } catch {
    cache.set(normalizedIp, null);
    return null;
  }
}
