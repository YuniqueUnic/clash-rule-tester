const cache = new Map<string, string | null>();

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

