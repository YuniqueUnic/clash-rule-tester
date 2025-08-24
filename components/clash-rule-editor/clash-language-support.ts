import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { StringStream } from "@codemirror/language";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Clash 规则类型常量
export const CLASH_RULE_TYPES = [
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
  "DST-IP-CIDR",
  "RULE-SET",
  "AND",
  "OR",
  "NOT",
  "SUB-RULE",
  "NETWORK",
  "UID",
  "IN-TYPE",
  "MATCH",
] as const;

/**
 * 创建 Clash 规则语言支持
 * @param policies 策略名称列表，用于语法高亮
 */
export function createClashLanguageSupport(
  policies: string[] = [],
): LanguageSupport {
  const clashLanguage = StreamLanguage.define({
    token(stream: StringStream, state: any) {
      // 跳过空白字符
      if (stream.eatSpace()) return null;

      // 注释行
      if (stream.match(/^#.*/)) {
        return "comment";
      }

      // 如果是行首，解析规则类型
      if (stream.sol()) {
        const match = stream.match(/^[A-Z][A-Z0-9-]*(?=,)/);
        if (match && Array.isArray(match)) {
          const ruleType = match[0];
          // 检查是否是有效的规则类型
          if (CLASH_RULE_TYPES.includes(ruleType as any)) {
            return "keyword";
          } else {
            return "invalid";
          }
        }
      }

      // 逗号分隔符
      if (stream.eat(",")) {
        return "punctuation";
      }

      // 策略名称（行尾的策略）
      const policyMatch = stream.match(
        new RegExp(`^(${policies.join("|")}|DIRECT|PROXY|REJECT|PASS)$`, "i"),
      );
      if (policyMatch) {
        return "className";
      }

      // 自定义策略名称（大写字母开头的单词）
      if (stream.match(/^[A-Z][A-Z0-9_-]*$/)) {
        return "className";
      }

      // IP 地址和 CIDR
      if (stream.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?/)) {
        return "number";
      }

      // IPv6 地址
      if (
        stream.match(/^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}(\/\d{1,3})?/)
      ) {
        return "number";
      }

      // 端口号
      if (stream.match(/^\d{1,5}$/)) {
        return "number";
      }

      // 域名
      if (
        stream.match(
          /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
        )
      ) {
        return "string";
      }

      // 通配符域名
      if (
        stream.match(
          /^\*\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
        )
      ) {
        return "string";
      }

      // 进程名称
      if (stream.match(/^[a-zA-Z0-9_-]+\.(exe|app|bin)$/)) {
        return "variable";
      }

      // 进程路径
      if (
        stream.match(
          /^[\/\\]?([a-zA-Z0-9_-]+[\/\\])*[a-zA-Z0-9_-]+\.(exe|app|bin)$/,
        )
      ) {
        return "variable";
      }

      // 国家代码（2-3 个大写字母）
      if (stream.match(/^[A-Z]{2,3}$/)) {
        return "atom";
      }

      // 网络类型
      if (stream.match(/^(tcp|udp|icmp)$/i)) {
        return "atom";
      }

      // 其他内容
      if (stream.next()) {
        return "text";
      }

      return null;
    },
  });

  return new LanguageSupport(clashLanguage);
}

/**
 * 创建 Clash 规则语法高亮样式
 * @param isDark 是否为暗色主题
 */
export function createClashHighlightStyle(
  isDark: boolean = false,
): HighlightStyle {
  const baseColors = isDark
    ? {
      keyword: "#569cd6", // 规则类型 - 蓝色
      punctuation: "#d4d4d4", // 逗号 - 灰色
      constant: "#4ec9b0", // 策略名称 - 青色
      number: "#b5cea8", // IP 地址、端口 - 绿色
      string: "#ce9178", // 域名 - 橙色
      variable: "#9cdcfe", // 进程名称 - 浅蓝色
      atom: "#dcdcaa", // 国家代码、网络类型 - 黄色
      comment: "#6a9955", // 注释 - 绿色
      invalid: "#f44747", // 无效规则类型 - 红色
      text: "#d4d4d4", // 其他文本 - 灰色
    }
    : {
      keyword: "#0000ff", // 规则类型 - 蓝色
      punctuation: "#000000", // 逗号 - 黑色
      constant: "#008080", // 策略名称 - 青色
      number: "#098658", // IP 地址、端口 - 绿色
      string: "#a31515", // 域名 - 红色
      variable: "#001080", // 进程名称 - 深蓝色
      atom: "#795e26", // 国家代码、网络类型 - 棕色
      comment: "#008000", // 注释 - 绿色
      invalid: "#ff0000", // 无效规则类型 - 红色
      text: "#000000", // 其他文本 - 黑色
    };

  return HighlightStyle.define([
    { tag: tags.keyword, color: baseColors.keyword, fontWeight: "bold" },
    { tag: tags.punctuation, color: baseColors.punctuation },
    { tag: tags.className, color: baseColors.constant, fontWeight: "bold" },
    { tag: tags.number, color: baseColors.number },
    { tag: tags.string, color: baseColors.string },
    { tag: tags.variableName, color: baseColors.variable },
    { tag: tags.atom, color: baseColors.atom },
    { tag: tags.comment, color: baseColors.comment, fontStyle: "italic" },
    {
      tag: tags.invalid,
      color: baseColors.invalid,
      textDecoration: "underline",
    },
    { tag: tags.content, color: baseColors.text },
  ]);
}

/**
 * 创建完整的 Clash 语言支持扩展
 * @param policies 策略名称列表
 * @param isDark 是否为暗色主题
 */
export function createClashLanguageExtension(
  policies: string[] = [],
  isDark: boolean = false,
) {
  return [
    createClashLanguageSupport(policies),
    syntaxHighlighting(createClashHighlightStyle(isDark)),
  ];
}
