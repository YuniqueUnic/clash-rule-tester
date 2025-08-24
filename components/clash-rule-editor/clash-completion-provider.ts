import {
  autocompletion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { CLASH_RULE_TYPES } from "./clash-language-support";

export interface ClashEditorData {
  policies: string[];
  geoIPCountries: string[];
  networkTypes: string[];
  geoSiteCategories: string[];
  asnList: string[];
  commonPorts: string[];
  commonProcesses: string[];
  commonDomainSuffixes: string[];
  rawData: {
    policies: Array<
      { name: string; description: string; type: string; category: string }
    >;
    geoIP: Array<
      { code: string; name: string; continent: string; popular: boolean }
    >;
    networkTypes: Array<
      { type: string; description: string; category: string }
    >;
    geoSite: Array<{ category: string; domains: string[] }>;
    asn: Array<{ asn: string; ip: string }>;
  };
}

/**
 * 创建 Clash 规则代码补全提供者
 * @param editorData 编辑器数据
 */
export function createClashCompletionProvider(editorData: ClashEditorData) {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;

        const line = context.state.doc.lineAt(context.pos);
        const lineText = line.text;
        const beforeCursor = lineText.slice(0, context.pos - line.from);

        // 分析当前位置在规则的哪个部分
        const parts = beforeCursor.split(",");
        const partIndex = parts.length - 1;

        let completions: Array<{
          label: string;
          type: string;
          detail: string;
          info?: string;
        }> = [];

        if (partIndex === 0) {
          // 第一部分：规则类型
          completions = CLASH_RULE_TYPES.map((type) => ({
            label: type,
            type: "keyword",
            detail: "规则类型",
            info: getRuleTypeDescription(type),
          }));
        } else if (partIndex === 1) {
          // 第二部分：规则值（根据规则类型决定）
          const ruleType = parts[0]?.trim();
          completions = getRuleValueCompletions(ruleType, editorData);
        } else if (partIndex === 2) {
          // 第三部分：策略名称
          completions = [
            // 内置策略
            { label: "DIRECT", type: "constant", detail: "直接连接" },
            { label: "PROXY", type: "constant", detail: "使用代理" },
            { label: "REJECT", type: "constant", detail: "拒绝连接" },
            { label: "PASS", type: "constant", detail: "跳过规则" },
            // 用户自定义策略
            ...editorData.rawData.policies.map((policy) => ({
              label: policy.name,
              type: "constant",
              detail: policy.description,
              info: `类型：${policy.type}\n分类：${policy.category}`,
            })),
          ];
        }

        // 过滤匹配的补全项
        const filteredCompletions = completions.filter((c) =>
          c.label.toLowerCase().includes(word.text.toLowerCase())
        );

        return {
          from: word.from,
          options: filteredCompletions,
        };
      },
    ],
  });
}

/**
 * 获取规则类型的描述
 */
function getRuleTypeDescription(ruleType: string): string {
  const descriptions: Record<string, string> = {
    "DOMAIN": "完全匹配域名",
    "DOMAIN-SUFFIX": "匹配域名后缀",
    "DOMAIN-KEYWORD": "匹配域名关键字",
    "DOMAIN-REGEX": "使用正则表达式匹配域名",
    "IP-CIDR": "匹配 IPv4 CIDR 地址段",
    "IP-CIDR6": "匹配 IPv6 CIDR 地址段",
    "IP-ASN": "匹配 ASN 号码",
    "GEOIP": "匹配 GeoIP 国家代码",
    "GEOSITE": "匹配 GeoSite 分类",
    "PROCESS-NAME": "匹配进程名称",
    "PROCESS-PATH": "匹配进程路径",
    "PROCESS-PATH-REGEX": "使用正则表达式匹配进程路径",
    "DST-PORT": "匹配目标端口",
    "SRC-PORT": "匹配源端口",
    "IN-PORT": "匹配入站端口",
    "SRC-IP-CIDR": "匹配源 IP CIDR",
    "DST-IP-CIDR": "匹配目标 IP CIDR",
    "RULE-SET": "匹配规则集",
    "AND": "逻辑与操作",
    "OR": "逻辑或操作",
    "NOT": "逻辑非操作",
    "SUB-RULE": "子规则",
    "NETWORK": "匹配网络类型",
    "UID": "匹配用户 ID",
    "IN-TYPE": "匹配入站类型",
    "MATCH": "匹配所有流量（通常放在最后）",
  };

  return descriptions[ruleType] || "未知规则类型";
}

/**
 * 根据规则类型获取对应的值补全
 */
function getRuleValueCompletions(
  ruleType: string,
  editorData: ClashEditorData,
): Array<{ label: string; type: string; detail: string; info?: string }> {
  switch (ruleType) {
    case "DOMAIN":
    case "DOMAIN-SUFFIX":
    case "DOMAIN-KEYWORD":
      return [
        ...editorData.commonDomainSuffixes.map((domain) => ({
          label: domain,
          type: "string",
          detail: "常用域名",
        })),
        // 从 GeoSite 数据中提取域名
        ...editorData.rawData.geoSite.flatMap((site) =>
          site.domains.slice(0, 5).map((domain) => ({
            label: domain,
            type: "string",
            detail: `来自 ${site.category}`,
          }))
        ),
      ];

    case "GEOIP":
      return editorData.rawData.geoIP.map((country) => ({
        label: country.code,
        type: "atom",
        detail: country.name,
        info: `大洲：${country.continent}${
          country.popular ? "\n热门国家" : ""
        }`,
      }));

    case "GEOSITE":
      return editorData.rawData.geoSite.map((site) => ({
        label: site.category,
        type: "atom",
        detail: `${site.domains.length} 个域名`,
        info: `包含域名：${site.domains.slice(0, 3).join(", ")}${
          site.domains.length > 3 ? "..." : ""
        }`,
      }));

    case "NETWORK":
      return editorData.rawData.networkTypes.map((network) => ({
        label: network.type,
        type: "atom",
        detail: network.description,
        info: `分类：${network.category}`,
      }));

    case "IP-ASN":
      return editorData.rawData.asn.map((asn) => ({
        label: asn.asn,
        type: "number",
        detail: `IP: ${asn.ip}`,
      }));

    case "DST-PORT":
    case "SRC-PORT":
    case "IN-PORT":
      return editorData.commonPorts.map((port) => ({
        label: port,
        type: "number",
        detail: getPortDescription(port),
      }));

    case "PROCESS-NAME":
      return editorData.commonProcesses.map((process) => ({
        label: process,
        type: "variable",
        detail: "常用进程",
      }));

    case "IP-CIDR":
      return [
        { label: "192.168.0.0/16", type: "number", detail: "私有网络" },
        { label: "10.0.0.0/8", type: "number", detail: "私有网络" },
        { label: "172.16.0.0/12", type: "number", detail: "私有网络" },
        { label: "127.0.0.0/8", type: "number", detail: "本地回环" },
        { label: "8.8.8.0/24", type: "number", detail: "Google DNS" },
        { label: "1.1.1.0/24", type: "number", detail: "Cloudflare DNS" },
      ];

    case "IP-CIDR6":
      return [
        { label: "::1/128", type: "number", detail: "IPv6 本地回环" },
        { label: "fc00::/7", type: "number", detail: "IPv6 私有网络" },
        { label: "fe80::/10", type: "number", detail: "IPv6 链路本地" },
      ];

    default:
      return [];
  }
}

/**
 * 获取端口描述
 */
function getPortDescription(port: string): string {
  const portDescriptions: Record<string, string> = {
    "80": "HTTP",
    "443": "HTTPS",
    "22": "SSH",
    "21": "FTP",
    "25": "SMTP",
    "53": "DNS",
    "110": "POP3",
    "143": "IMAP",
    "993": "IMAPS",
    "995": "POP3S",
    "587": "SMTP (提交)",
    "465": "SMTPS",
    "8080": "HTTP 代理",
    "8443": "HTTPS 代理",
    "3389": "RDP",
    "5432": "PostgreSQL",
    "3306": "MySQL",
    "6379": "Redis",
    "27017": "MongoDB",
    "9200": "Elasticsearch",
    "5601": "Kibana",
  };

  return portDescriptions[port] || "端口";
}
