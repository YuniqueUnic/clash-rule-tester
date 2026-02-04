import { CLASH_RULE_TYPES } from "@/lib/clash-data-sources";
import { parseRuleLine, parseRulesText } from "@/lib/clash-rule-parse";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  lineNumber: number;
  rule: string;
  severity: ValidationSeverity;
  message: string;
  /**
   * 0-based column range（相对当前行）。用于映射到 CodeMirror Diagnostic 的 from/to。
   * 不提供则默认整行。
   */
  column?: { start: number; end: number };
}

export interface ValidationContext {
  /**
   * 允许的策略名称（用于“未知策略”提示）。
   * 注意：Clash 真实环境策略名可为任意字符串；这里仅作为提示，不做硬错误。
   */
  policies?: string[];
  geoIPCountries?: string[];
  geoSiteCategories?: string[];
  networkTypes?: string[];
  asnList?: string[];
}

export function validateRulesText(
  rulesText: string,
  context: ValidationContext = {},
): ValidationIssue[] {
  return parseRulesText(rulesText)
    .flatMap((parsed) => validateParsedRule(parsed, context));
}

export function validateRuleText(
  ruleText: string,
  lineNumber: number,
  context: ValidationContext = {},
): ValidationIssue[] {
  return validateParsedRule(parseRuleLine(ruleText, lineNumber), context);
}

function validateParsedRule(
  parsed: ReturnType<typeof parseRuleLine>,
  context: ValidationContext,
): ValidationIssue[] {
  if (parsed.kind !== "rule") return [];

  const issues: ValidationIssue[] = [];
  const { parts, ruleType } = parsed;

  // 1) 基础格式
  if (!ruleType) {
    issues.push({
      lineNumber: parsed.lineNumber,
      rule: parsed.original,
      severity: "error",
      message: "规则格式错误：缺少规则类型",
    });
    return issues;
  }

  if (ruleType === "MATCH") {
    if (parts.length < 2 || !parsed.policy) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "error",
        message: "MATCH 规则格式错误：需要 MATCH,<策略>",
      });
      return issues;
    }
  } else if (parsed.isLogical) {
    // AND/OR/NOT：至少需要 type + 1 个条件 + policy
    if (parts.length < 3 || !parsed.policy) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "error",
        message: `${ruleType} 规则格式错误：需要 ${ruleType},(条件... ),<策略>`,
      });
      return issues;
    }
  } else {
    // 默认规则：至少 type + value
    if (parts.length < 2 || !parsed.content) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "error",
        message: "规则格式错误：至少需要规则类型和规则值",
      });
      return issues;
    }

    // 缺策略：给 warning（兼容旧逻辑：默认 DIRECT），但不再静默吞掉
    if (!parsed.policy) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "warning",
        message: "缺少策略名称：运行时可能默认使用 DIRECT",
      });
    }
  }

  // 2) 规则类型是否受支持
  if (!CLASH_RULE_TYPES.includes(ruleType as any)) {
    issues.push({
      lineNumber: parsed.lineNumber,
      rule: parsed.original,
      severity: "error",
      message: `未知的规则类型: ${ruleType}`,
      column: { start: 0, end: ruleType.length },
    });
  }

  // 3) 规则值校验（非 MATCH）
  if (ruleType !== "MATCH") {
    const content = parsed.content ?? "";
    if (!content) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "error",
        message: "规则值不能为空",
      });
    } else {
      issues.push(...validateRuleValue(ruleType, content, parsed, context));
    }
  }

  // 4) 策略校验（仅提示，不做硬错误）
  const policy = parsed.policy?.trim();
  if (policy) {
    const allowedPolicies = context.policies ?? [];
    if (allowedPolicies.length > 0 && !allowedPolicies.includes(policy)) {
      issues.push({
        lineNumber: parsed.lineNumber,
        rule: parsed.original,
        severity: "warning",
        message: `未知的策略：${policy}`,
      });
    }
  } else if (ruleType === "MATCH") {
    // MATCH 必须有策略，上面已返回；这里兜底
    issues.push({
      lineNumber: parsed.lineNumber,
      rule: parsed.original,
      severity: "error",
      message: "MATCH 缺少策略名称",
    });
  }

  // 5) 额外字段（可选参数等）
  if (parsed.extra && parsed.extra.length > 0) {
    issues.push({
      lineNumber: parsed.lineNumber,
      rule: parsed.original,
      severity: "warning",
      message: "规则包含额外参数（部分 Clash 可选参数本工具可能未完全支持）",
    });
  }

  return issues;
}

function validateRuleValue(
  ruleType: string,
  content: string,
  parsed: ReturnType<typeof parseRuleLine>,
  context: ValidationContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (ruleType) {
    case "DOMAIN":
    case "DOMAIN-SUFFIX": {
      if (!isValidDomain(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的域名格式",
        });
      }
      break;
    }
    case "DOMAIN-KEYWORD": {
      // 关键词允许更宽松：仅需非空
      break;
    }
    case "DOMAIN-REGEX": {
      try {
        RegExp(content);
      } catch {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的正则表达式",
        });
      }
      break;
    }
    case "IP-CIDR": {
      if (!isValidIPv4CIDR(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的 IPv4 CIDR 格式",
        });
      }
      break;
    }
    case "IP-CIDR6": {
      if (!isValidIPv6CIDR(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的 IPv6 CIDR 格式",
        });
      }
      break;
    }
    case "GEOIP": {
      if (!/^[a-zA-Z]{2}$/.test(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的国家代码（应为 ISO 3166-1 alpha-2）",
        });
        break;
      }

      const allowed = context.geoIPCountries ?? [];
      if (allowed.length > 0 && !allowed.includes(content.toUpperCase())) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "warning",
          message: `未知的国家代码：${content}`,
        });
      }
      break;
    }
    case "GEOSITE": {
      const allowed = context.geoSiteCategories ?? [];
      if (allowed.length > 0 && !allowed.includes(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "warning",
          message: `未知的 GeoSite 分类：${content}`,
        });
      }
      break;
    }
    case "NETWORK": {
      const allowed = context.networkTypes ?? [];
      if (allowed.length > 0 && !allowed.includes(content.toLowerCase())) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "warning",
          message: `未知的网络类型：${content}`,
        });
      }
      break;
    }
    case "DST-PORT":
    case "SRC-PORT":
    case "IN-PORT": {
      if (!isValidPortPattern(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: "无效的端口号（1-65535）或端口范围（如 80-443）",
        });
      }
      break;
    }
    case "IP-ASN": {
      const allowed = context.asnList ?? [];
      if (allowed.length > 0 && !allowed.includes(content)) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "warning",
          message: `未知的 ASN: ${content}`,
        });
      }
      break;
    }
    case "AND":
    case "OR":
    case "NOT": {
      // content 类似 "(DOMAIN,google.com),(DST-PORT,443)"
      const groups = content.match(/\([^)]+\)/g) ?? [];
      if (groups.length === 0) {
        issues.push({
          lineNumber: parsed.lineNumber,
          rule: parsed.original,
          severity: "error",
          message: `${ruleType} 规则缺少条件（应包含括号表达式）`,
        });
      }
      break;
    }
  }

  return issues;
}

function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  const wildcardDomainRegex =
    /^\*\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) || wildcardDomainRegex.test(domain);
}

function isValidIPv4CIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;
  const ipParts = ip.split(".");

  if (ipParts.length !== 4) return false;

  for (const part of ipParts) {
    const num = Number.parseInt(part, 10);
    if (Number.isNaN(num) || num < 0 || num > 255) return false;
  }

  const prefixNum = Number.parseInt(prefix, 10);
  return !Number.isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32;
}

function isValidIPv6CIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;
  const prefixNum = Number.parseInt(prefix, 10);

  if (Number.isNaN(prefixNum) || prefixNum < 0 || prefixNum > 128) return false;

  // 简化的 IPv6 验证
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

function isValidPortPattern(pattern: string): boolean {
  // 单端口
  if (/^\d+$/.test(pattern)) {
    const portNum = Number.parseInt(pattern, 10);
    return portNum >= 1 && portNum <= 65535;
  }

  // 范围：80-443
  const match = pattern.match(/^(\d+)\s*-\s*(\d+)$/);
  if (match) {
    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2], 10);
    return (
      start >= 1 &&
      start <= 65535 &&
      end >= 1 &&
      end <= 65535 &&
      start <= end
    );
  }

  return false;
}
