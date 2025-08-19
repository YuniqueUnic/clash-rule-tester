/// TODO: need to add src-port dst-port src-ip dst-ip
export interface TestRequest {
  domain?: string;
  ip?: string;
  port?: string;
  process?: string;
  processPath?: string;
  protocol?: string;
  network?: string;
  uid?: string;
  inType?: string;
}

export interface MatchResult {
  matched: boolean;
  rule: string;
  lineNumber: number;
  ruleType: string;
  policy: string;
  explanation: string;
  detailedExplanation: string;
  matchedContent: string;
  matchRange?: string;
  matchPosition?: string;
}

export class ClashRuleEngine {
  private rules: ParsedRule[] = [];

  constructor(rulesText: string) {
    this.parseRules(rulesText);
  }

  private parseRules(rulesText: string) {
    const lines = rulesText.split("\n");
    this.rules = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const parts = trimmed.split(",");
      if (parts.length < 2) return;

      const ruleType = parts[0].trim();
      const content = parts[1].trim();
      const policy = parts.length > 2
        ? parts.slice(2).join(",").trim()
        : "DIRECT";

      this.rules.push({
        original: line,
        lineNumber: index + 1,
        ruleType,
        content,
        policy,
        isLogical: ["AND", "OR", "NOT"].includes(ruleType),
      });
    });
  }

  public testRequest(request: TestRequest): MatchResult | null {
    for (const rule of this.rules) {
      const result = this.matchRule(rule, request);
      if (result.matched) {
        return result;
      }
    }

    // If no rule matches, return MATCH rule or default
    const matchRule = this.rules.find((r) => r.ruleType === "MATCH");
    if (matchRule) {
      return {
        matched: true,
        rule: matchRule.original,
        lineNumber: matchRule.lineNumber,
        ruleType: matchRule.ruleType,
        policy: matchRule.policy,
        explanation: "Default fallback rule - matches all requests",
        detailedExplanation:
          `代码 line ${matchRule.lineNumber}, MATCH,${matchRule.policy}; 说明：默认兜底规则，匹配所有未被其他规则捕获的请求`,
        matchedContent: "所有请求",
        matchPosition: "默认规则",
      };
    }

    return null;
  }

  private matchRule(rule: ParsedRule, request: TestRequest): MatchResult {
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

      case "IP-CIDR":
        matched = this.matchIPCIDR(request.ip, content);
        matchedContent = request.ip || "";
        matchPosition = content;
        if (matched && request.ip) {
          const [network, prefix] = content.split("/");
          const prefixNum = Number.parseInt(prefix);
          const networkStart = this.getNetworkStart(network, prefixNum);
          const networkEnd = this.getNetworkEnd(network, prefixNum);
          matchRange = `${networkStart} - ${networkEnd}`;
        }
        explanation = matched
          ? `IP "${request.ip}" is within CIDR range "${content}"`
          : `IP "${request.ip}" is not within CIDR range "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 被上述规则捕获，${content} 覆盖了 ${matchRange}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 未被此规则匹配，不在 CIDR 范围 ${content} 内`;
        break;

      case "IP-CIDR6":
        matched = this.matchIPv6CIDR(request.ip, content);
        matchedContent = request.ip || "";
        matchPosition = content;
        explanation = matched
          ? `IPv6 "${request.ip}" is within CIDR range "${content}"`
          : `IPv6 "${request.ip}" is not within CIDR range "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 被上述规则捕获，IPv6 CIDR 范围：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 未被此规则匹配，不在 IPv6 CIDR 范围 ${content} 内`;
        break;

      case "GEOIP":
        matched = this.matchGeoIP(request.ip, content);
        matchedContent = request.ip || "";
        matchPosition = content;
        explanation = matched
          ? `IP "${request.ip}" is geolocated to "${content}"`
          : `IP "${request.ip}" is not geolocated to "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 被上述规则捕获，地理位置匹配：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 未被此规则匹配，地理位置不是：${content}`;
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
        matched = request.processPath
          ? request.processPath.includes(content)
          : false;
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
      case "SRC-PORT":
      case "IN-PORT":
        matched = this.matchPort(request.port, content);
        matchedContent = request.port || "";
        matchPosition = content;
        const portType = ruleType === "DST-PORT"
          ? "目标端口"
          : ruleType === "SRC-PORT"
          ? "源端口"
          : "入站端口";
        explanation = matched
          ? `${portType} "${request.port}" matches "${content}"`
          : `${portType} "${request.port}" does not match "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${portType} ${request.port} 被上述规则捕获，匹配端口：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${portType} ${request.port} 未被此规则匹配，不匹配端口：${content}`;
        break;

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

      case "IP-ASN":
        matched = this.matchIPASN(request.ip, content);
        matchedContent = request.ip || "";
        matchPosition = content;
        explanation = matched
          ? `IP "${request.ip}" belongs to ASN "${content}"`
          : `IP "${request.ip}" does not belong to ASN "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 被上述规则捕获，属于 ASN：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.ip} 未被此规则匹配，不属于 ASN：${content}`;
        break;

      case "GEOSITE":
        matched = this.matchGeoSite(request.domain, content);
        matchedContent = request.domain || "";
        matchPosition = content;
        explanation = matched
          ? `Domain "${request.domain}" belongs to geosite category "${content}"`
          : `Domain "${request.domain}" does not belong to geosite category "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 被上述规则捕获，属于 GeoSite 类别：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：${request.domain} 未被此规则匹配，不属于 GeoSite 类别：${content}`;
        break;

      case "PROCESS-PATH-REGEX":
        try {
          const regex = new RegExp(content, "i");
          matched = request.processPath
            ? regex.test(request.processPath)
            : false;
          explanation = matched
            ? `Process path "${request.processPath}" matches regex "${content}"`
            : `Process path "${request.processPath}" does not match regex "${content}"`;
          detailedExplanation = matched
            ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 被上述规则捕获，匹配正则表达式：${content}`
            : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：进程路径 ${request.processPath} 未被此规则匹配，不匹配正则表达式：${content}`;
        } catch (e) {
          matched = false;
          explanation = `Invalid regex pattern "${content}": ${
            e instanceof Error ? e.message : "Unknown error"
          }`;
          detailedExplanation =
            `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：无效的正则表达式模式：${content}`;
        }
        break;

      case "SRC-IP-CIDR":
        matched = this.matchIPCIDR(request.ip, content);
        matchedContent = request.ip || "";
        matchPosition = content;
        explanation = matched
          ? `Source IP "${request.ip}" is within CIDR range "${content}"`
          : `Source IP "${request.ip}" is not within CIDR range "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源 IP ${request.ip} 被上述规则捕获，属于 CIDR 范围：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：源 IP ${request.ip} 未被此规则匹配，不属于 CIDR 范围：${content}`;
        break;

      case "RULE-SET":
        matched = this.matchRuleSet(request, content);
        matchedContent = content;
        explanation = matched
          ? `Request matches rule set "${content}"`
          : `Request does not match rule set "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求被上述规则集捕获：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：请求未被此规则集匹配：${content}`;
        break;

      case "AND":
        matched = this.matchLogicalAND(request, content);
        matchedContent = content;
        explanation = matched
          ? `All conditions in AND rule "${content}" are satisfied`
          : `Not all conditions in AND rule "${content}" are satisfied`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：AND 规则的所有条件都被满足：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：AND 规则的条件不完全满足：${content}`;
        break;

      case "OR":
        matched = this.matchLogicalOR(request, content);
        matchedContent = content;
        explanation = matched
          ? `At least one condition in OR rule "${content}" is satisfied`
          : `No conditions in OR rule "${content}" are satisfied`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：OR 规则的至少一个条件被满足：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：OR 规则的条件都不满足：${content}`;
        break;

      case "NOT":
        matched = this.matchLogicalNOT(request, content);
        matchedContent = content;
        explanation = matched
          ? `NOT condition "${content}" is satisfied (rule does not match)`
          : `NOT condition "${content}" is not satisfied (rule matches)`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：NOT 条件被满足，规则不匹配：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：NOT 条件不被满足，规则匹配：${content}`;
        break;

      case "NETWORK":
        matched = request.network === content;
        matchedContent = request.network || "";
        matchPosition = content;
        explanation = matched
          ? `Network type "${request.network}" matches "${content}"`
          : `Network type "${request.network}" does not match "${content}"`;
        detailedExplanation = matched
          ? `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：网络类型 ${request.network} 被上述规则捕获，匹配网络类型：${content}`
          : `代码 line ${lineNumber}, ${ruleType},${content},${policy}; 说明：网络类型 ${request.network} 未被此规则匹配，不匹配网络类型：${content}`;
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
      matchRange,
      matchPosition,
    };
  }

  private matchPort(port: string | undefined, pattern: string): boolean {
    if (!port) return false;

    // Support port ranges (e.g., "80-443")
    if (pattern.includes("-")) {
      const [start, end] = pattern.split("-").map((p) =>
        Number.parseInt(p.trim())
      );
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

  private matchIPv6CIDR(ip: string | undefined, cidr: string): boolean {
    if (!ip || !ip.includes(":")) return false;

    try {
      const [network, prefixLength] = cidr.split("/");
      if (!network || !prefixLength) return false;

      // Simplified IPv6 matching - expand both addresses and compare
      const expandedIP = this.expandIPv6(ip);
      const expandedNetwork = this.expandIPv6(network);
      const prefix = Number.parseInt(prefixLength);

      // Compare the first 'prefix' bits
      const ipBits = this.ipv6ToBits(expandedIP);
      const networkBits = this.ipv6ToBits(expandedNetwork);

      return ipBits.substring(0, prefix) === networkBits.substring(0, prefix);
    } catch {
      return false;
    }
  }

  private expandIPv6(ip: string): string {
    // Simplified IPv6 expansion - in production would use proper IPv6 library
    const parts = ip.split(":");
    const expanded = parts.map((part) => part.padStart(4, "0"));
    return expanded.join(":");
  }

  private ipv6ToBits(ip: string): string {
    return ip
      .split(":")
      .map((part) => Number.parseInt(part, 16).toString(2).padStart(16, "0"))
      .join("");
  }

  private matchIPASN(ip: string | undefined, asn: string): boolean {
    if (!ip) return false;

    // Mock ASN data - in production would use real ASN database
    const mockASNData: Record<string, string> = {
      "8.8.8.8": "15169", // Google
      "1.1.1.1": "13335", // Cloudflare
      "114.114.114.114": "4134", // China Telecom
      "223.5.5.5": "37963", // Alibaba
    };

    return mockASNData[ip] === asn;
  }

  // TODO: Need to expose to user to edit.
  private matchGeoSite(domain: string | undefined, category: string): boolean {
    if (!domain) return false;

    // Mock GeoSite data - in production would use real GeoSite database
    const mockGeoSiteData: Record<string, string[]> = {
      google: [
        "google.com",
        "googleapis.com",
        "googleusercontent.com",
        "youtube.com",
      ],
      facebook: ["facebook.com", "instagram.com", "whatsapp.com"],
      microsoft: ["microsoft.com", "office.com", "outlook.com", "xbox.com"],
      apple: ["apple.com", "icloud.com", "itunes.com"],
      cn: ["baidu.com", "qq.com", "weibo.com", "taobao.com"],
    };

    const sites = mockGeoSiteData[category.toLowerCase()] || [];
    return sites.some((site) => domain.endsWith(site) || domain === site);
  }

  /// TODO: need expose the rule provider to user to edit
  private matchRuleSet(request: TestRequest, ruleSetName: string): boolean {
    // Mock rule set matching - in production would load external rule sets
    const mockRuleSets: Record<string, (req: TestRequest) => boolean> = {
      ads: (req) =>
        req.domain?.includes("ads") || req.domain?.includes("analytics") ||
        false,
      social: (req) =>
        ["facebook.com", "twitter.com", "instagram.com"].some((site) =>
          req.domain?.includes(site) || false
        ),
      streaming: (req) =>
        ["netflix.com", "youtube.com", "twitch.tv"].some((site) =>
          req.domain?.includes(site) || false
        ),
    };

    const ruleSet = mockRuleSets[ruleSetName.toLowerCase()];
    return ruleSet ? ruleSet(request) : false;
  }

  private matchLogicalAND(request: TestRequest, conditions: string): boolean {
    // Parse conditions like "(DOMAIN,google.com),(DST-PORT,443)"
    const conditionList = this.parseLogicalConditions(conditions);
    return conditionList.every((condition) =>
      this.evaluateCondition(request, condition)
    );
  }

  private matchLogicalOR(request: TestRequest, conditions: string): boolean {
    const conditionList = this.parseLogicalConditions(conditions);
    return conditionList.some((condition) =>
      this.evaluateCondition(request, condition)
    );
  }

  private matchLogicalNOT(request: TestRequest, condition: string): boolean {
    const parsedCondition = this.parseLogicalConditions(condition)[0];
    return !this.evaluateCondition(request, parsedCondition);
  }

  private parseLogicalConditions(
    conditions: string,
  ): Array<{ type: string; content: string }> {
    // Simple parser for conditions like "(DOMAIN,google.com),(DST-PORT,443)"
    const matches = conditions.match(/$$[^)]+$$/g) || [];
    return matches.map((match) => {
      const content = match.slice(1, -1); // Remove parentheses
      const [type, ...rest] = content.split(",");
      return { type: type.trim(), content: rest.join(",").trim() };
    });
  }

  private evaluateCondition(
    request: TestRequest,
    condition: { type: string; content: string },
  ): boolean {
    const mockRule: ParsedRule = {
      original: `${condition.type},${condition.content},DIRECT`,
      lineNumber: 0,
      ruleType: condition.type,
      content: condition.content,
      policy: "DIRECT",
      isLogical: false,
    };

    return this.matchRule(mockRule, request).matched;
  }

  private matchIPCIDR(ip: string | undefined, cidr: string): boolean {
    if (!ip) return false;

    try {
      const [network, prefixLength] = cidr.split("/");
      if (!network || !prefixLength) return false;

      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xffffffff << (32 - Number.parseInt(prefixLength))) >>> 0;

      return (ipNum & mask) === (networkNum & mask);
    } catch {
      return false;
    }
  }

  // TODO: Shoul expose to use to edit
  private matchGeoIP(ip: string | undefined, country: string): boolean {
    if (!ip) return false;

    // Enhanced mock GeoIP data
    const mockGeoData: Record<string, string> = {
      "8.8.8.8": "US",
      "8.8.4.4": "US",
      "1.1.1.1": "US",
      "1.0.0.1": "US",
      "114.114.114.114": "CN",
      "223.5.5.5": "CN",
      "119.29.29.29": "CN",
      "208.67.222.222": "US",
      "208.67.220.220": "US",
      "9.9.9.9": "US",
      "149.112.112.112": "US",
    };

    return mockGeoData[ip] === country.toUpperCase();
  }

  private ipToNumber(ip: string): number {
    return ip.split(".").reduce(
      (acc, octet) => (acc << 8) + Number.parseInt(octet),
      0,
    ) >>> 0;
  }

  private numberToIp(num: number): string {
    return [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join(".");
  }

  private getNetworkStart(network: string, prefixLength: number): string {
    const networkNum = this.ipToNumber(network);
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    const networkStart = networkNum & mask;
    return this.numberToIp(networkStart);
  }

  private getNetworkEnd(network: string, prefixLength: number): string {
    const networkNum = this.ipToNumber(network);
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    const networkStart = networkNum & mask;
    const hostMask = ~mask >>> 0;
    const networkEnd = networkStart | hostMask;
    return this.numberToIp(networkEnd);
  }

  public getRuleCount(): number {
    return this.rules.filter((r) => !r.ruleType.startsWith("#")).length;
  }

  public validateRules(): ValidationResult[] {
    const results: ValidationResult[] = [];

    this.rules.forEach((rule) => {
      const validation = this.validateRule(rule);
      if (!validation.valid) {
        results.push({
          lineNumber: rule.lineNumber,
          rule: rule.original,
          error: validation.error ?? "Invalid rule",
          severity: validation.severity ?? "error",
        });
      }
    });

    return results;
  }

  private validateRule(
    rule: ParsedRule,
  ): { valid: boolean; error?: string; severity?: "error" | "warning" } {
    const { ruleType, content, policy } = rule;

    const supportedTypes = [
      "DOMAIN",
      "DOMAIN-SUFFIX",
      "DOMAIN-KEYWORD",
      "DOMAIN-REGEX",
      "IP-CIDR",
      "IP-CIDR6",
      "IP-ASN",
      "GEOIP",
      "GEOSITE",
      "PROCESS-NAME",
      "PROCESS-PATH",
      "PROCESS-PATH-REGEX",
      "DST-PORT",
      "SRC-PORT",
      "IN-PORT",
      "SRC-IP-CIDR",
      "RULE-SET",
      "AND",
      "OR",
      "NOT",
      "SUB-RULE",
      "NETWORK",
      "UID",
      "IN-TYPE",
      "MATCH",
    ];

    if (!supportedTypes.includes(ruleType)) {
      return {
        valid: false,
        error: `Unsupported rule type: ${ruleType}`,
        severity: "error",
      };
    }

    if (ruleType === "IP-CIDR") {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(content)) {
        return {
          valid: false,
          error: `Invalid IPv4 CIDR format: ${content}`,
          severity: "error",
        };
      }
    }

    if (ruleType === "IP-CIDR6") {
      const cidr6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/;
      if (!cidr6Regex.test(content)) {
        return {
          valid: false,
          error: `Invalid IPv6 CIDR format: ${content}`,
          severity: "error",
        };
      }
    }

    const validPolicies = ["DIRECT", "PROXY", "REJECT", "PASS"];
    const isCustomPolicy = policy.match(/^[A-Z][A-Z0-9_-]*$/);

    if (!validPolicies.includes(policy) && !isCustomPolicy) {
      return {
        valid: false,
        error: `Invalid policy format: ${policy}`,
        severity: "warning",
      };
    }

    return { valid: true };
  }
}

interface ParsedRule {
  original: string;
  lineNumber: number;
  ruleType: string;
  content: string;
  policy: string;
  isLogical: boolean;
}

interface ValidationResult {
  lineNumber: number;
  rule: string;
  error: string;
  severity: "error" | "warning";
}
