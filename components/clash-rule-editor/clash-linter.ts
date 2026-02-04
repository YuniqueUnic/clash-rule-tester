import { Diagnostic, linter } from "@codemirror/lint";
import { CLASH_RULE_TYPES } from "./clash-language-support";
import type { ClashEditorData } from "./clash-completion-provider";

/**
 * 创建 Clash 规则语法检查器
 * @param editorData 编辑器数据
 */
export function createClashLinter(editorData: ClashEditorData) {
  return linter((view) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;

    // 逐行检查
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const lineText = line.text.trim();

      // 跳过空行和注释
      if (!lineText || lineText.startsWith("#")) {
        continue;
      }

      // 检查规则格式
      const ruleDiagnostics = validateClashRule(
        lineText,
        line.from,
        editorData,
      );
      diagnostics.push(...ruleDiagnostics);
    }

    return diagnostics;
  });
}

/**
 * 验证单条 Clash 规则
 */
function validateClashRule(
  ruleText: string,
  lineStart: number,
  editorData: ClashEditorData,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const parts = ruleText.split(",").map((part) => part.trim());

  // 检查基本格式
  if (parts.length < 2) {
    diagnostics.push({
      from: lineStart,
      to: lineStart + ruleText.length,
      severity: "error",
      message: "规则格式错误：至少需要规则类型和策略名称",
    });
    return diagnostics;
  }

  const [ruleType, ruleValue, policy, ...extraParts] = parts;

  // 检查规则类型
  if (!CLASH_RULE_TYPES.includes(ruleType as any)) {
    const ruleTypeEnd = lineStart + ruleType.length;
    diagnostics.push({
      from: lineStart,
      to: ruleTypeEnd,
      severity: "error",
      message: `未知的规则类型: ${ruleType}`,
    });
  }

  // 检查规则值
  const ruleValueDiagnostics = validateRuleValue(
    ruleType,
    ruleValue,
    lineStart,
    ruleType.length + 1,
    editorData,
  );
  diagnostics.push(...ruleValueDiagnostics);

  // 检查策略名称
  if (policy) {
    const policyDiagnostics = validatePolicy(
      policy,
      lineStart,
      ruleType.length + ruleValue.length + 2,
      editorData,
    );
    diagnostics.push(...policyDiagnostics);
  } else if (ruleType !== "MATCH") {
    // MATCH 规则可以只有两部分
    diagnostics.push({
      from: lineStart,
      to: lineStart + ruleText.length,
      severity: "error",
      message: "缺少策略名称",
    });
  }

  // 检查是否有多余的部分
  if (extraParts.length > 0) {
    const extraStart = lineStart + ruleType.length + ruleValue.length +
      (policy?.length || 0) + 2;
    diagnostics.push({
      from: extraStart,
      to: lineStart + ruleText.length,
      severity: "warning",
      message: "规则包含多余的部分",
    });
  }

  return diagnostics;
}

/**
 * 验证规则值
 */
function validateRuleValue(
  ruleType: string,
  ruleValue: string,
  lineStart: number,
  valueStart: number,
  editorData: ClashEditorData,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const valueEnd = valueStart + ruleValue.length;

  if (!ruleValue) {
    diagnostics.push({
      from: lineStart + valueStart,
      to: lineStart + valueStart,
      severity: "error",
      message: "规则值不能为空",
    });
    return diagnostics;
  }

  switch (ruleType) {
    case "DOMAIN":
    case "DOMAIN-SUFFIX":
    case "DOMAIN-KEYWORD":
      if (!isValidDomain(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "error",
          message: "无效的域名格式",
        });
      }
      break;

    case "DOMAIN-REGEX":
      try {
        new RegExp(ruleValue);
      } catch {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "error",
          message: "无效的正则表达式",
        });
      }
      break;

    case "IP-CIDR":
      if (!isValidIPv4CIDR(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "error",
          message: "无效的 IPv4 CIDR 格式",
        });
      }
      break;

    case "IP-CIDR6":
      if (!isValidIPv6CIDR(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "error",
          message: "无效的 IPv6 CIDR 格式",
        });
      }
      break;

    case "GEOIP":
      if (!editorData.geoIPCountries.includes(ruleValue.toUpperCase())) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "warning",
          message: `未知的国家代码：${ruleValue}`,
        });
      }
      break;

    case "GEOSITE":
      if (!editorData.geoSiteCategories.includes(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "warning",
          message: `未知的 GeoSite 分类：${ruleValue}`,
        });
      }
      break;

    case "NETWORK":
      if (!editorData.networkTypes.includes(ruleValue.toLowerCase())) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "warning",
          message: `未知的网络类型：${ruleValue}`,
        });
      }
      break;

    case "DST-PORT":
    case "SRC-PORT":
    case "IN-PORT":
      if (!isValidPort(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "error",
          message: "无效的端口号（1-65535）",
        });
      }
      break;

    case "IP-ASN":
      if (!editorData.asnList.includes(ruleValue)) {
        diagnostics.push({
          from: lineStart + valueStart,
          to: lineStart + valueEnd,
          severity: "warning",
          message: `未知的 ASN: ${ruleValue}`,
        });
      }
      break;
  }

  return diagnostics;
}

/**
 * 验证策略名称
 */
function validatePolicy(
  policy: string,
  lineStart: number,
  policyStart: number,
  editorData: ClashEditorData,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const policyEnd = policyStart + policy.length;

  const builtInPolicies = ["DIRECT", "PROXY", "REJECT", "PASS"];
  const allPolicies = [...builtInPolicies, ...editorData.policies];

  if (!allPolicies.includes(policy)) {
    diagnostics.push({
      from: lineStart + policyStart,
      to: lineStart + policyEnd,
      severity: "warning",
      message: `未知的策略：${policy}`,
    });
  }

  return diagnostics;
}

// 辅助验证函数

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
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }

  const prefixNum = parseInt(prefix, 10);
  return !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32;
}

function isValidIPv6CIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;
  const prefixNum = parseInt(prefix, 10);

  if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 128) return false;

  // 简化的 IPv6 验证
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

function isValidPort(port: string): boolean {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}
