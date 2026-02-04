import "server-only";

function isValidIPv4Address(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

function isPrivateIPv4(hostname: string): boolean {
  if (!isValidIPv4Address(hostname)) return false;
  const [a, b] = hostname.split(".").map((x) => Number(x));

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isLikelyLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;
  if (lower.endsWith(".localhost")) return true;
  return false;
}

function isPrivateIPv6(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
  return false;
}

export function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export function validateOpenAICompatibleEndpoint(endpoint: string): {
  ok: true;
  endpoint: string;
} | {
  ok: false;
  error: string;
} {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, error: "Endpoint 不是合法的 URL" };
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Endpoint 只支持 http/https" };
  }

  if (isProduction && url.protocol !== "https:") {
    return { ok: false, error: "生产环境仅允许 https endpoint" };
  }

  const hostname = url.hostname;

  if (isProduction) {
    if (isLikelyLocalHostname(hostname)) {
      return { ok: false, error: "生产环境不允许使用 localhost endpoint" };
    }

    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
      return { ok: false, error: "生产环境不允许使用私有网段 endpoint" };
    }
  }

  return { ok: true, endpoint: normalizeBaseUrl(url.toString()) };
}
