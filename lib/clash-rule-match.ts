import type { EngineRule, MatchContext, MatchResult, TestRequest } from "@/lib/clash-rule-types";
import { splitByCommaOutsideParens } from "@/lib/clash-rule-parse";

type Condition = { type: string; content: string };

export function matchRequest(
  rules: EngineRule[],
  request: TestRequest,
  context: MatchContext = {},
): MatchResult | null {
  for (const rule of rules) {
    const result = matchRule(rule, request, context);
    if (result.matched) return result;
  }

  const fallbackRule = rules.find((r) => r.ruleType === "MATCH");
  if (!fallbackRule) return null;
  return matchRule(fallbackRule, request, context);
}

export function matchRule(
  rule: EngineRule,
  request: TestRequest,
  context: MatchContext = {},
): MatchResult {
  const { ruleType, content, policy, original, lineNumber } = rule;

  let matched = false;
  let explanation = "";
  let detailedExplanation = "";
  let matchedContent = "";
  let matchRange = "";
  let matchPosition = "";

  switch (ruleType) {
    case "DOMAIN":
      matched = request.domain === content;
      matchedContent = request.domain || "";
      matchPosition = content;
      explanation = matched
        ? `Domain "${request.domain}" exactly matches "${content}"`
        : `Domain "${request.domain}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，完全匹配域名：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，需要完全匹配域名：${content}`;
      break;

    case "DOMAIN-SUFFIX":
      matched = request.domain
        ? request.domain.endsWith(content) || request.domain === content
        : false;
      matchedContent = request.domain || "";
      matchPosition = content;
      explanation = matched
        ? `Domain "${request.domain}" ends with suffix "${content}"`
        : `Domain "${request.domain}" does not end with suffix "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，主要匹配位置为后缀：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，域名后缀不是：${content}`;
      break;

    case "DOMAIN-KEYWORD":
      matched = request.domain ? request.domain.includes(content) : false;
      matchedContent = request.domain || "";
      matchPosition = content;
      explanation = matched
        ? `Domain "${request.domain}" contains keyword "${content}"`
        : `Domain "${request.domain}" does not contain keyword "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，主要匹配位置为关键词：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，域名中不包含关键词：${content}`;
      break;

    case "IP-CIDR": {
      const targetIP = request.dstIPv4 || request.srcIPv4;
      matched = targetIP ? matchIPCIDR(targetIP, content) : false;
      matchedContent = targetIP || "";
      matchPosition = content;
      if (matched && targetIP) {
        const [network, prefix] = content.split("/");
        const prefixNum = Number.parseInt(prefix);
        const networkStart = getNetworkStart(network, prefixNum);
        const networkEnd = getNetworkEnd(network, prefixNum);
        matchRange = `${networkStart} - ${networkEnd}`;
      }
      explanation = matched
        ? `IP "${targetIP}" is within CIDR range "${content}"`
        : `IP "${targetIP || "N/A"}" is not within CIDR range "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${targetIP} 被上述规则捕获，${content} 覆盖了 ${matchRange}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${
          targetIP || "N/A"
        } 未被此规则匹配，不在 CIDR 范围 ${content} 内`;
      break;
    }

    case "IP-CIDR6": {
      const targetIPv6 = request.dstIPv6 || request.srcIPv6;
      matched = targetIPv6 ? matchIPv6CIDR(targetIPv6, content) : false;
      matchedContent = targetIPv6 || "";
      matchPosition = content;
      explanation = matched
        ? `IPv6 "${targetIPv6}" is within CIDR range "${content}"`
        : `IPv6 "${
          targetIPv6 || "N/A"
        }" is not within CIDR range "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${targetIPv6} 被上述规则捕获，IPv6 CIDR 范围：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${
          targetIPv6 || "N/A"
        } 未被此规则匹配，不在 IPv6 CIDR 范围 ${content} 内`;
      break;
    }

    case "GEOIP":
      if (request.geoIP) {
        matched = request.geoIP.toUpperCase() === content.toUpperCase();
        matchedContent = request.geoIP;
        matchPosition = content;
        explanation = matched
          ? `GeoIP "${request.geoIP}" matches "${content}"`
          : `GeoIP "${request.geoIP}" does not match "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：GeoIP 国家代码 ${request.geoIP} 匹配：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：GeoIP 国家代码 ${request.geoIP} 不匹配：${content}`;
      } else {
        const geoIP = request.dstIPv4 || request.srcIPv4;
        matched = geoIP ? matchGeoIP(geoIP, content, context.geoIPDatabase) : false;
        matchedContent = geoIP || "";
        matchPosition = content;
        explanation = matched
          ? `IP "${geoIP}" is geolocated to "${content}"`
          : `IP "${geoIP || "N/A"}" is not geolocated to "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${geoIP} 被上述规则捕获，地理位置匹配：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${
            geoIP || "N/A"
          } 未被此规则匹配，地理位置不是：${content}`;
      }
      break;

    case "PROCESS-NAME":
      matched = request.process === content;
      matchedContent = request.process || "";
      matchPosition = content;
      explanation = matched
        ? `Process name "${request.process}" matches "${content}"`
        : `Process name "${request.process}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程名 ${request.process} 被上述规则捕获，完全匹配：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程名 ${request.process} 未被此规则匹配，需要完全匹配：${content}`;
      break;

    case "PROCESS-PATH":
      matched = request.processPath ? request.processPath.includes(content) : false;
      matchedContent = request.processPath || "";
      matchPosition = content;
      explanation = matched
        ? `Process path "${request.processPath}" contains "${content}"`
        : `Process path "${request.processPath}" does not contain "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 被上述规则捕获，包含路径：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 未被此规则匹配，不包含路径：${content}`;
      break;

    case "DST-PORT":
      matched = matchPort(request.dstPort, content);
      matchedContent = request.dstPort || "";
      matchPosition = content;
      explanation = matched
        ? `目标端口 "${matchedContent}" matches "${content}"`
        : `目标端口 "${matchedContent || "N/A"}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：目标端口 ${matchedContent} 被上述规则捕获，匹配端口：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：目标端口 ${
          matchedContent || "N/A"
        } 未被此规则匹配，不匹配端口：${content}`;
      break;

    case "SRC-PORT":
      matched = matchPort(request.srcPort, content);
      matchedContent = request.srcPort || "";
      matchPosition = content;
      explanation = matched
        ? `源端口 "${matchedContent}" matches "${content}"`
        : `源端口 "${matchedContent}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源端口 ${matchedContent} 被上述规则捕获，匹配端口：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源端口 ${matchedContent} 未被此规则匹配，不匹配端口：${content}`;
      break;

    case "IN-PORT": {
      const inPort = request.dstPort || request.srcPort;
      matched = inPort ? matchPort(inPort, content) : false;
      matchedContent = inPort || "";
      matchPosition = content;
      explanation = matched
        ? `入站端口 "${inPort}" matches "${content}"`
        : `入站端口 "${inPort || "N/A"}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：入站端口 ${inPort} 被上述规则捕获，匹配端口：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：入站端口 ${
          inPort || "N/A"
        } 未被此规则匹配，不匹配端口：${content}`;
      break;
    }

    case "MATCH":
      matched = true;
      matchedContent = "所有请求";
      matchPosition = "默认规则";
      explanation = "Default rule that matches all requests";
      detailedExplanation =
        `代码 line ${lineNumber}, ${ruleType},${policy}; 说明：默认兜底规则，匹配所有未被其他规则捕获的请求`;
      break;

    case "DOMAIN-REGEX":
      try {
        const regex = new RegExp(content, "i");
        matched = request.domain ? regex.test(request.domain) : false;
        explanation = matched
          ? `Domain "${request.domain}" matches regex pattern "${content}"`
          : `Domain "${request.domain}" does not match regex pattern "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，匹配正则表达式：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，不匹配正则表达式：${content}`;
      } catch (e) {
        matched = false;
        explanation = `Invalid regex pattern "${content}": ${
          e instanceof Error ? e.message : "Unknown error"
        }`;
        detailedExplanation =
          `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：无效的正则表达式模式：${content}`;
      }
      break;

    case "IP-ASN": {
      const asnIP = request.dstIPv4 || request.srcIPv4;
      matched = asnIP ? matchIPASN(asnIP, content, context.asnData) : false;
      matchedContent = asnIP || "";
      matchPosition = content;
      explanation = matched
        ? `IP "${asnIP}" belongs to ASN "${content}"`
        : `IP "${asnIP || "N/A"}" does not belong to ASN "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${asnIP} 被上述规则捕获，属于 ASN：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${
          asnIP || "N/A"
        } 未被此规则匹配，不属于 ASN：${content}`;
      break;
    }

    case "GEOSITE":
      matched = matchGeoSite(request.domain, content, context.geoSiteData);
      matchedContent = request.domain || "";
      matchPosition = content;
      explanation = matched
        ? `Domain "${request.domain}" belongs to geosite category "${content}"`
        : `Domain "${request.domain}" does not belong to geosite category "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，属于 GeoSite 分类：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，不属于 GeoSite 分类：${content}`;
      break;

    case "PROCESS-PATH-REGEX":
      try {
        const regex = new RegExp(content, "i");
        matched = request.processPath ? regex.test(request.processPath) : false;
        matchedContent = request.processPath || "";
        matchPosition = content;
        explanation = matched
          ? `Process path "${request.processPath}" matches regex pattern "${content}"`
          : `Process path "${request.processPath}" does not match regex pattern "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 被上述规则捕获，匹配正则：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 未被此规则匹配，不匹配正则：${content}`;
      } catch {
        matched = false;
        explanation = `Invalid regex pattern "${content}"`;
        detailedExplanation =
          `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：无效的正则表达式模式：${content}`;
      }
      break;

    case "SRC-IP-CIDR":
      matched = matchIPCIDR(request.srcIPv4 || request.srcIPv6, content);
      matchedContent = request.srcIPv4 || request.srcIPv6 || "";
      matchPosition = content;
      explanation = matched
        ? `源 IP "${matchedContent}" is within CIDR range "${content}"`
        : `源 IP "${matchedContent || "N/A"}" is not within CIDR range "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源 IP ${matchedContent} 被上述规则捕获，匹配范围：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源 IP ${
          matchedContent || "N/A"
        } 未被此规则匹配，不在范围：${content}`;
      break;

    case "DST-IP-CIDR":
      matched = matchIPCIDR(request.dstIPv4 || request.dstIPv6, content);
      matchedContent = request.dstIPv4 || request.dstIPv6 || "";
      matchPosition = content;
      explanation = matched
        ? `目标 IP "${matchedContent}" is within CIDR range "${content}"`
        : `目标 IP "${matchedContent || "N/A"}" is not within CIDR range "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：目标 IP ${matchedContent} 被上述规则捕获，匹配范围：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：目标 IP ${
          matchedContent || "N/A"
        } 未被此规则匹配，不在范围：${content}`;
      break;

    case "RULE-SET":
      matched = matchRuleSet(request, content, context.ruleSetData);
      matchedContent = request.domain || "";
      matchPosition = content;
      explanation = matched
        ? `Request matches rule set "${content}"`
        : `Request does not match rule set "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求被 Rule Set 捕获：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求未命中 Rule Set：${content}`;
      break;

    case "AND":
      matched = matchLogicalAND(request, content, context);
      matchedContent = "逻辑条件";
      matchPosition = content;
      explanation = matched
        ? `Request matches all AND conditions`
        : `Request does not match all AND conditions`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求满足所有 AND 条件`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求不满足所有 AND 条件`;
      break;

    case "OR":
      matched = matchLogicalOR(request, content, context);
      matchedContent = "逻辑条件";
      matchPosition = content;
      explanation = matched
        ? `Request matches at least one OR condition`
        : `Request does not match any OR conditions`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求满足至少一个 OR 条件`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求不满足任何 OR 条件`;
      break;

    case "NOT":
      matched = matchLogicalNOT(request, content, context);
      matchedContent = "逻辑条件";
      matchPosition = content;
      explanation = matched
        ? `Request does not match NOT condition`
        : `Request matches NOT condition`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求不满足 NOT 条件（因此规则命中）`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求满足 NOT 条件（因此规则未命中）`;
      break;

    case "NETWORK":
      matched = request.network === content;
      matchedContent = request.network || "";
      matchPosition = content;
      explanation = matched
        ? `Network "${request.network}" matches "${content}"`
        : `Network "${request.network}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：网络类型 ${request.network} 匹配：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：网络类型 ${request.network} 未匹配：${content}`;
      break;

    case "UID":
      matched = request.uid === content;
      matchedContent = request.uid || "";
      matchPosition = content;
      explanation = matched
        ? `User ID "${request.uid}" matches "${content}"`
        : `User ID "${request.uid}" does not match "${content}"`;
      detailedExplanation = matched
        ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：用户 ID ${request.uid} 被上述规则捕获，匹配用户 ID：${content}`
        : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：用户 ID ${request.uid} 未被此规则匹配，不匹配用户 ID：${content}`;
      break;

    default:
      matched = false;
      explanation = `Unknown rule type: ${ruleType}`;
      detailedExplanation =
        `代码 line ${lineNumber}, 未知规则类型：${ruleType}`;
  }

  return {
    matched,
    rule: original,
    lineNumber,
    ruleType,
    policy,
    explanation,
    detailedExplanation,
    matchedContent,
    matchRange: matchRange || undefined,
    matchPosition: matchPosition || undefined,
  };
}

function matchPort(port: string | undefined, pattern: string): boolean {
  if (!port) return false;

  // Support port ranges (e.g., "80-443")
  if (pattern.includes("-")) {
    const [start, end] = pattern.split("-").map((p) => Number.parseInt(p.trim()));
    const portNum = Number.parseInt(port);
    return portNum >= start && portNum <= end;
  }

  // Support multiple ports (e.g., "80,443,8080")
  if (pattern.includes(",")) {
    const ports = pattern.split(",").map((p) => p.trim());
    return ports.includes(port);
  }

  return port === pattern;
}

function matchIPv6CIDR(ip: string | undefined, cidr: string): boolean {
  if (!ip || !ip.includes(":")) return false;

  try {
    const [network, prefixLength] = cidr.split("/");
    if (!network || !prefixLength) return false;

    // Simplified IPv6 matching - expand both addresses and compare
    const expandedIP = expandIPv6(ip);
    const expandedNetwork = expandIPv6(network);
    const prefix = Number.parseInt(prefixLength);

    // Compare the first 'prefix' bits
    const ipBits = ipv6ToBits(expandedIP);
    const networkBits = ipv6ToBits(expandedNetwork);

    return ipBits.substring(0, prefix) === networkBits.substring(0, prefix);
  } catch {
    return false;
  }
}

function expandIPv6(ip: string): string {
  // Simplified IPv6 expansion - in production would use proper IPv6 library
  const parts = ip.split(":");
  const expanded = parts.map((part) => part.padStart(4, "0"));
  return expanded.join(":");
}

function ipv6ToBits(ip: string): string {
  return ip
    .split(":")
    .map((part) => Number.parseInt(part, 16).toString(2).padStart(16, "0"))
    .join("");
}

function matchIPASN(
  ip: string | undefined,
  asn: string,
  asnData: Record<string, string> | undefined,
): boolean {
  if (!ip) return false;
  return (asnData ?? {})[ip] === asn;
}

function matchGeoSite(
  domain: string | undefined,
  category: string,
  geoSiteData: Record<string, string[]> | undefined,
): boolean {
  if (!domain) return false;
  const sites = (geoSiteData ?? {})[category.toLowerCase()] || [];
  return sites.some((site) => domain.endsWith(site) || domain === site);
}

function matchRuleSet(
  request: TestRequest,
  ruleSetName: string,
  ruleSetData: Record<string, (request: TestRequest) => boolean> | undefined,
): boolean {
  const ruleSet = (ruleSetData ?? {})[ruleSetName.toLowerCase()];
  return ruleSet ? ruleSet(request) : false;
}

function parseLogicalConditions(conditions: string): Condition[] {
  return splitByCommaOutsideParens(conditions)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const inner = part.startsWith("(") && part.endsWith(")")
        ? part.slice(1, -1)
        : part;
      const innerParts = splitByCommaOutsideParens(inner);
      const type = (innerParts[0] ?? "").trim();
      const content = innerParts.slice(1).join(",").trim();
      return { type, content };
    });
}

function evaluateCondition(
  request: TestRequest,
  condition: Condition,
  context: MatchContext,
): boolean {
  const mockRule: EngineRule = {
    original: `${condition.type},${condition.content},DIRECT`,
    lineNumber: 0,
    ruleType: condition.type,
    content: condition.content,
    policy: "DIRECT",
    isLogical: ["AND", "OR", "NOT"].includes(condition.type),
  };
  return matchRule(mockRule, request, context).matched;
}

function matchLogicalAND(
  request: TestRequest,
  conditions: string,
  context: MatchContext,
): boolean {
  const conditionList = parseLogicalConditions(conditions);
  return conditionList.every((condition) => evaluateCondition(request, condition, context));
}

function matchLogicalOR(
  request: TestRequest,
  conditions: string,
  context: MatchContext,
): boolean {
  const conditionList = parseLogicalConditions(conditions);
  return conditionList.some((condition) => evaluateCondition(request, condition, context));
}

function matchLogicalNOT(
  request: TestRequest,
  condition: string,
  context: MatchContext,
): boolean {
  const parsedCondition = parseLogicalConditions(condition)[0];
  if (!parsedCondition) return true;
  return !evaluateCondition(request, parsedCondition, context);
}

function matchIPCIDR(ip: string | undefined, cidr: string): boolean {
  if (!ip) return false;

  try {
    const [network, prefixLength] = cidr.split("/");
    if (!network || !prefixLength) return false;

    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = (0xffffffff << (32 - Number.parseInt(prefixLength))) >>> 0;

    return (ipNum & mask) === (networkNum & mask);
  } catch {
    return false;
  }
}

function matchGeoIP(
  ip: string | undefined,
  country: string,
  geoIPDatabase: Record<string, string> | undefined,
): boolean {
  if (!ip) return false;
  return (geoIPDatabase ?? {})[ip] === country.toUpperCase();
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce(
    (acc, octet) => (acc << 8) + Number.parseInt(octet),
    0,
  ) >>> 0;
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join(".");
}

function getNetworkStart(network: string, prefixLength: number): string {
  const networkNum = ipToNumber(network);
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  const networkStart = networkNum & mask;
  return numberToIp(networkStart);
}

function getNetworkEnd(network: string, prefixLength: number): string {
  const networkNum = ipToNumber(network);
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  const networkStart = networkNum & mask;
  const hostMask = ~mask >>> 0;
  const networkEnd = networkStart | hostMask;
  return numberToIp(networkEnd);
}

