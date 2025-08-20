"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Redo, Save, Undo, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

// CodeMirror 6 imports
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  HighlightStyle,
  Language,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import {
  autocompletion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { StringStream } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { ClashDataSources } from "@/lib/clash-data-sources";

// Clash 规则语法高亮器
// 这的 d 规则语法高亮器写得有问题：
// 1. 第一个逗号前的部分应该是规则类型，这里应该使用 tags.keyword
// 2. 逗号应该使用 tags.punctuation
// 3. 第二个逗号前的部分应该是用户自定的内容
// 4. 逗号
// 5. 策略名称
// 但是只有 MATCH 这个规则类型特殊一点，MATCH，策略名称 这样的格了
// 改进的 Clash 规则语法高亮器
const createClashLanguage = (
  policies: string[] = ["DIRECT", "PROXY", "REJECT", "PASS"],
) => {
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
        if (match) {
          return "keyword";
        }
      }

      // 逗号
      if (stream.eat(",")) {
        return "punctuation";
      }

      // 策略名称（行尾的大写单词）
      const policyMatch = stream.match(
        new RegExp(`^(${policies.join("|")}|DIRECT|PROXY|REJECT|PASS)$`, "i"),
      );
      if (policyMatch) {
        return "constant";
      }

      // 自定义策略名称（大写字母开头的单词）
      if (stream.match(/^[A-Z][A-Z0-9_-]*$/)) {
        return "constant";
      }

      // IP 地址和 CIDR
      if (stream.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?/)) {
        return "number";
      }

      // 域名
      if (
        stream.match(
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        )
      ) {
        return "string";
      }

      // 端口号
      if (stream.match(/^\d{1,5}$/)) {
        return "number";
      }

      // 其他内容
      if (stream.match(/^[^\s,]+/)) {
        return "string";
      }

      stream.next();
      return null;
    },
    startState() {
      return {};
    },
    copyState(state: any) {
      return { ...state };
    },
  });

  return new LanguageSupport(clashLanguage);
};

// 计算行号列宽度的函数
const calculateLineNumberWidth = (lineCount: number) => {
  const digits = Math.max(2, lineCount.toString().length);
  // 每个数字大约 8px，加上左右 padding
  return Math.max(32, digits * 8 + 16);
};

// 创建动态主题样式
const createClashTheme = (isDark: boolean, lineCount: number = 1) => {
  const lineNumberWidth = calculateLineNumberWidth(lineCount);

  return EditorView.theme({
    "&": {
      color: isDark ? "#e2e8f0" : "#1e293b",
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    ".cm-content": {
      padding: "16px",
      caretColor: isDark ? "#3b82f6" : "#2563eb",
      fontSize: "14px",
      fontFamily: "var(--font-mono)",
      lineHeight: "1.5",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-editor.cm-focused": {
      outline: "none",
    },
    ".cm-line": {
      padding: "0 4px",
    },
    ".cm-gutters": {
      backgroundColor: isDark ? "#1e293b" : "#f8fafc",
      color: isDark ? "#64748b" : "#64748b",
      border: "none",
      borderRight: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
    },
    ".cm-gutter": {
      minWidth: `${lineNumberWidth}px`,
    },
    ".cm-lineNumbers": {
      minWidth: `${lineNumberWidth}px`,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      color: isDark ? "#64748b" : "#64748b",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
      padding: "0 6px",
      textAlign: "right",
      minWidth: `${lineNumberWidth - 12}px`,
    },
    ".cm-activeLine": {
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: isDark ? "#1e40af" : "#3b82f6",
      color: "white",
    },
    ".cm-cursor": {
      borderLeftColor: isDark ? "#3b82f6" : "#2563eb",
    },
    ".cm-searchMatch": {
      backgroundColor: isDark ? "#fbbf24" : "#fcd34d",
      color: isDark ? "#1f2937" : "#1f2937",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: isDark ? "#f59e0b" : "#f59e0b",
    },
    ".cm-tooltip": {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderRadius: "6px",
      boxShadow: isDark
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        maxHeight: "200px",
        overflowY: "auto",
      },
      "& > ul > li": {
        padding: "6px 12px",
        cursor: "pointer",
        borderRadius: "4px",
        margin: "2px",
        color: isDark ? "#e2e8f0" : "#1e293b",
        backgroundColor: "transparent",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: isDark ? "#3b82f6" : "#3b82f6",
        color: "#ffffff",
        fontWeight: "500",
      },
      "& > ul > li:hover": {
        backgroundColor: isDark ? "#475569" : "#f1f5f9",
      },
    },
  }, { dark: isDark });
};

// 动态 Clash 规则语法高亮样式
const createClashHighlightStyle = (isDark: boolean) =>
  HighlightStyle.define([
    // 注释 - 灰色，斜体
    {
      tag: tags.comment,
      color: isDark ? "#64748b" : "#64748b",
      fontStyle: "italic",
    },
    // 规则类型关键字 - 蓝色，粗体
    {
      tag: tags.keyword,
      color: isDark ? "#60a5fa" : "#2563eb",
      fontWeight: "bold",
    },
    // 字符串内容 - 绿色
    {
      tag: tags.string,
      color: isDark ? "#34d399" : "#059669",
    },
    // 数字 - 橙色
    {
      tag: tags.number,
      color: isDark ? "#fb923c" : "#ea580c",
    },
    // 常量值（策略名称）- 紫色，粗体
    {
      tag: tags.constant(tags.name),
      color: isDark ? "#a78bfa" : "#7c3aed",
      fontWeight: "bold",
    },
    // 运算符和标点 - 灰色
    {
      tag: tags.operator,
      color: isDark ? "#94a3b8" : "#64748b",
    },
    {
      tag: tags.punctuation,
      color: isDark ? "#94a3b8" : "#64748b",
    },
  ]);

// 动态语法高亮器，适配当前主题

// 创建动态错误检测器
const createClashLinter = (
  policies: string[],
  geoIPCountries: string[],
  networkTypes: string[],
  currentGeoIPCountries: string[] = [],
  currentNetworkTypes: string[] = [],
) => {
  // 获取真实数据源
  const dataSources = ClashDataSources;
  const realPolicies = dataSources.getPolicies();
  const realCountries = dataSources.getGeoIPCountries();
  const realNetworkTypes = dataSources.getNetworkTypes();
  const commonProcesses = dataSources.getCommonProcesses();

  return linter((view) => {
    const diagnostics: Diagnostic[] = [];
    const text = view.state.doc.toString();
    const lines = text.split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const parts = line.split(",");
      if (parts.length < 2) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).to,
          severity: "error",
          message: "规则格式不正确，至少需要规则类型和内容",
          source: "clash-rule-linter",
        });
        return;
      }

      const [ruleType, content, policy] = parts.map((p) => p.trim());

      // 验证规则类型
      if (!CLASH_RULE_TYPES.includes(ruleType)) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from + line.indexOf(ruleType),
          to: view.state.doc.line(index + 1).from + line.indexOf(ruleType) +
            ruleType.length,
          severity: "error",
          message: `无效的规则类型：${ruleType}`,
          source: "clash-rule-linter",
        });
      }

      // 验证策略名称
      if (policy) {
        const allValidPolicies = [
          ...realPolicies.map((p) => p.name),
          ...policies,
        ];
        const isValidPolicy = allValidPolicies.includes(policy) ||
          policy.match(/^[A-Z][A-Z0-9_-]*$/);

        if (!isValidPolicy) {
          diagnostics.push({
            from: view.state.doc.line(index + 1).from +
              line.lastIndexOf(policy),
            to: view.state.doc.line(index + 1).from + line.lastIndexOf(policy) +
              policy.length,
            severity: "error",
            message: `无效的策略名称：${policy}`,
            source: "clash-rule-linter",
          });
        }
      }

      // 增强的规则内容验证
      if (ruleType && content) {
        switch (ruleType) {
          case "GEOIP":
            // 使用当前环境的真实数据进行验证
            const allValidCountryCodes = Array.from(
              new Set([
                ...realCountries.map((c) => c.code),
                ...geoIPCountries,
                ...currentGeoIPCountries,
              ]),
            );
            if (!allValidCountryCodes.includes(content.toUpperCase())) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "warning",
                message:
                  `未知的国家代码：${content}，建议使用标准国家代码或在测试区域添加自定义代码`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "NETWORK":
            // 使用当前环境的真实数据进行验证
            const allValidNetworkTypes = Array.from(
              new Set([
                ...realNetworkTypes.map((n) => n.type),
                ...networkTypes,
                ...currentNetworkTypes,
              ]),
            );
            if (!allValidNetworkTypes.includes(content.toUpperCase())) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "warning",
                message:
                  `未知的网络类型：${content}，建议使用标准网络类型或在测试区域添加自定义类型`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "PROCESS-NAME":
            // 检查是否是常见进程名
            if (!commonProcesses.includes(content) && !content.includes(".")) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "info",
                message: `进程名 ${content} 不在常见进程列表中，请确认是否正确`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "IP-CIDR":
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
            if (!cidrRegex.test(content)) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "error",
                message: `无效的 IPv4 CIDR 格式：${content}`,
                source: "clash-rule-linter",
              });
            } else {
              // 验证 IP 地址范围
              const [ip, prefix] = content.split("/");
              const prefixNum = parseInt(prefix);
              if (prefixNum < 0 || prefixNum > 32) {
                diagnostics.push({
                  from: view.state.doc.line(index + 1).from +
                    line.indexOf(content),
                  to: view.state.doc.line(index + 1).from +
                    line.indexOf(content) + content.length,
                  severity: "error",
                  message: `IPv4 CIDR 前缀长度必须在 0-32 之间：${content}`,
                  source: "clash-rule-linter",
                });
              }
            }
            break;

          case "IP-CIDR6":
            const cidr6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/;
            if (!cidr6Regex.test(content)) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "error",
                message: `无效的 IPv6 CIDR 格式：${content}`,
                source: "clash-rule-linter",
              });
            } else {
              // 验证 IPv6 前缀长度
              const [, prefix] = content.split("/");
              const prefixNum = parseInt(prefix);
              if (prefixNum < 0 || prefixNum > 128) {
                diagnostics.push({
                  from: view.state.doc.line(index + 1).from +
                    line.indexOf(content),
                  to: view.state.doc.line(index + 1).from +
                    line.indexOf(content) + content.length,
                  severity: "error",
                  message: `IPv6 CIDR 前缀长度必须在 0-128 之间：${content}`,
                  source: "clash-rule-linter",
                });
              }
            }
            break;

          case "DST-PORT":
          case "SRC-PORT":
          case "IN-PORT":
            const portNum = parseInt(content);
            if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "error",
                message:
                  `无效的端口号：${content}，端口号必须在 1-65535 范围内`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "DOMAIN":
            // 增强的域名格式验证
            const domainRegex =
              /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!domainRegex.test(content)) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "warning",
                message: `域名格式可能不正确：${content}`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "DOMAIN-REGEX":
            // 验证正则表达式语法
            try {
              new RegExp(content);
            } catch (e) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "error",
                message: `无效的正则表达式：${content}`,
                source: "clash-rule-linter",
              });
            }
            break;
        }
      }
    });

    return diagnostics;
  });
};

interface ClashRuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  highlightedLine?: number;
  className?: string;
  ruleCount?: number;
  hasError?: boolean;
  errorCount?: number;
  policies?: string[];
  geoIPCountries?: string[];
  networkTypes?: string[];
  // 当前环境的真实数据
  currentGeoIPCountries?: string[];
  currentNetworkTypes?: string[];
}

const CLASH_RULE_TYPES = [
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

const CLASH_POLICIES = ["DIRECT", "PROXY", "REJECT", "PASS"];

// Clash 规则语法高亮器
const clashHighlighting = EditorView.updateListener.of((update) => {
  // 这里可以添加动态语法高亮逻辑
  // 现在使用默认高亮
});

// 创建动态代码补全配置的函数
const createClashCompletion = (
  policies: string[],
  geoIPCountries: string[],
  networkTypes: string[],
  currentGeoIPCountries: string[] = [],
  currentNetworkTypes: string[] = [],
) => {
  // 获取真实数据源
  const dataSources = ClashDataSources;
  const realPolicies = dataSources.getPolicies();
  const realCountries = dataSources.getGeoIPCountries();
  const realNetworkTypes = dataSources.getNetworkTypes();
  const commonPorts = dataSources.getCommonPorts();
  const commonProcesses = dataSources.getCommonProcesses();
  const domainSuffixes = dataSources.getCommonDomainSuffixes();

  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;

        const completions = [
          // 规则类型
          ...CLASH_RULE_TYPES.map((type) => ({
            label: type,
            type: "keyword",
            detail: "规则类型",
          })),

          // 策略 - 合并用户自定义和内置策略
          ...realPolicies.map((policy) => ({
            label: policy.name,
            type: "constant",
            detail: policy.description,
          })),
          ...policies.filter((p) => !realPolicies.some((rp) => rp.name === p))
            .map((policy) => ({
              label: policy,
              type: "constant",
              detail: "自定义策略",
            })),

          // GeoIP 国家代码 - 使用当前环境的真实数据
          ...Array.from(new Set([...geoIPCountries, ...currentGeoIPCountries]))
            .map((country) => {
              const realCountry = realCountries.find((c) => c.code === country);
              return {
                label: country,
                type: "constant",
                detail: realCountry
                  ? `${realCountry.name} (${realCountry.continent})`
                  : "自定义国家代码",
              };
            }),

          // 网络类型 - 使用当前环境的真实数据
          ...Array.from(new Set([...networkTypes, ...currentNetworkTypes])).map(
            (network) => {
              const realNetwork = realNetworkTypes.find((n) =>
                n.type === network
              );
              return {
                label: network,
                type: "constant",
                detail: realNetwork
                  ? realNetwork.description
                  : "自定义网络类型",
              };
            },
          ),

          // 常见端口
          ...commonPorts.map((port) => ({
            label: port.port.toString(),
            type: "number",
            detail: `${port.description} (${port.category})`,
          })),

          // 常见进程名
          ...commonProcesses.map((process) => ({
            label: process,
            type: "text",
            detail: "常见进程",
          })),

          // 常见域名后缀
          ...domainSuffixes.map((suffix) => ({
            label: `example.${suffix}`,
            type: "text",
            detail: `域名示例 (.${suffix})`,
          })),

          // 常见域名
          { label: "google.com", type: "text", detail: "Google 搜索" },
          { label: "github.com", type: "text", detail: "GitHub 代码托管" },
          { label: "youtube.com", type: "text", detail: "YouTube 视频" },
          { label: "facebook.com", type: "text", detail: "Facebook 社交" },
          { label: "twitter.com", type: "text", detail: "Twitter 社交" },
          { label: "instagram.com", type: "text", detail: "Instagram 图片" },
          { label: "linkedin.com", type: "text", detail: "LinkedIn 职场" },
          { label: "reddit.com", type: "text", detail: "Reddit 论坛" },
          {
            label: "stackoverflow.com",
            type: "text",
            detail: "Stack Overflow 问答",
          },
          { label: "wikipedia.org", type: "text", detail: "维基百科" },

          // IP 地址示例
          { label: "192.168.1.0/24", type: "text", detail: "私有网络 CIDR" },
          { label: "10.0.0.0/8", type: "text", detail: "私有网络 CIDR" },
          { label: "172.16.0.0/12", type: "text", detail: "私有网络 CIDR" },
          { label: "8.8.8.8", type: "text", detail: "Google DNS" },
          { label: "1.1.1.1", type: "text", detail: "Cloudflare DNS" },
        ];

        return {
          from: word.from,
          options: completions.filter((c) =>
            c.label.toLowerCase().includes(word.text.toLowerCase())
          ),
        };
      },
    ],
  });
};

// 行高亮状态字段
const lineHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    // 检查是否有行高亮效果
    for (const effect of tr.effects) {
      if (effect.is(lineHighlightEffect)) {
        const { lineNumber, isDark } = effect.value;
        const builder = new RangeSetBuilder<Decoration>();

        if (lineNumber && lineNumber > 0 && lineNumber <= tr.state.doc.lines) {
          try {
            const line = tr.state.doc.line(lineNumber);
            if (line) {
              const decoration = Decoration.line({
                attributes: {
                  style: `background-color: ${
                    isDark
                      ? "rgba(59, 130, 246, 0.2)"
                      : "rgba(59, 130, 246, 0.15)"
                  }; border-left: 3px solid ${isDark ? "#3b82f6" : "#2563eb"};`,
                },
              });
              builder.add(line.from, line.from, decoration);
            }
          } catch (error) {
            console.warn("Line highlight error:", error);
          }
        }

        return builder.finish();
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 行高亮效果
const lineHighlightEffect = StateEffect.define<
  { lineNumber: number; isDark: boolean }
>();

// 创建行高亮扩展
const createLineHighlightExtension = () => {
  return [lineHighlightField];
};

export function ClashRuleEditor({
  value,
  onChange,
  highlightedLine,
  className,
  ruleCount,
  hasError,
  errorCount,
  policies = CLASH_POLICIES,
  geoIPCountries = [],
  networkTypes = [],
  currentGeoIPCountries = [],
  currentNetworkTypes = [],
}: ClashRuleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const lines = value.split("\n").length;
    setLineCount(lines);
  }, [value]);

  useEffect(() => {
    // 只在组件首次加载时初始化历史记录，避免 value 变化时重置
    if (history.length === 0) {
      setHistory([value]);
      setHistoryIndex(0);
    }
  }, [value]);

  // 初始化 CodeMirror 编辑器 - 只在组件挂载时创建一次
  useEffect(() => {
    if (editorRef.current && !editorViewRef.current) {
      const extensions = [
        basicSetup,
        createClashLanguage(policies),
        syntaxHighlighting(createClashHighlightStyle(isDark)),
        createClashTheme(isDark, lineCount),
        keymap.of([indentWithTab, ...defaultKeymap]),
        createClashCompletion(
          policies,
          geoIPCountries,
          networkTypes,
          currentGeoIPCountries,
          currentNetworkTypes,
        ),
        createClashLinter(
          policies,
          geoIPCountries,
          networkTypes,
          currentGeoIPCountries,
          currentNetworkTypes,
        ),
        lintGutter(),
        createLineHighlightExtension(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
            saveToHistory(newValue);
          }
        }),
        // 设置编辑器高度和滚动 - 适应新的布局
        EditorView.theme({
          ".cm-editor": {
            height: "100%",
            maxHeight: "none",
          },
          ".cm-scroller": {
            overflow: "auto",
            height: "100%",
          },
          ".cm-content": {
            minHeight: "100%",
            padding: "16px",
          },
        }),
      ];

      const state = EditorState.create({
        doc: value,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      editorViewRef.current = view;

      return () => {
        if (editorViewRef.current) {
          editorViewRef.current.destroy();
          editorViewRef.current = null;
        }
      };
    }
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 单独处理主题变化
  useEffect(() => {
    if (editorViewRef.current) {
      const newTheme = createClashTheme(isDark, lineCount);
      const newHighlightStyle = syntaxHighlighting(
        createClashHighlightStyle(isDark),
      );

      editorViewRef.current.dispatch({
        effects: [
          StateEffect.reconfigure.of([
            basicSetup,
            createClashLanguage(policies),
            newHighlightStyle,
            newTheme,
            keymap.of([indentWithTab, ...defaultKeymap]),
            createClashCompletion(policies, geoIPCountries, networkTypes),
            createClashLinter(policies, geoIPCountries, networkTypes),
            lintGutter(),
            createLineHighlightExtension(),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const newValue = update.state.doc.toString();
                onChange(newValue);
                saveToHistory(newValue);
              }
            }),
            EditorView.theme({
              ".cm-editor": {
                height: "100%",
                maxHeight: "none",
              },
              ".cm-scroller": {
                overflow: "auto",
                height: "100%",
              },
              ".cm-content": {
                minHeight: "100%",
                padding: "16px",
              },
            }),
          ]),
        ],
      });
    }
  }, [isDark, policies, geoIPCountries, networkTypes, lineCount]);

  // 处理行高亮变化
  useEffect(() => {
    if (editorViewRef.current && highlightedLine) {
      editorViewRef.current.dispatch({
        effects: lineHighlightEffect.of({
          lineNumber: highlightedLine,
          isDark: isDark,
        }),
      });
    }
  }, [highlightedLine, isDark]);

  // 更新编辑器内容
  useEffect(() => {
    if (editorViewRef.current) {
      const currentValue = editorViewRef.current.state.doc.toString();
      if (currentValue !== value) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  // 撤销功能
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newValue = history[newIndex];
      setHistoryIndex(newIndex);
      onChange(newValue);
      toast({
        title: "已撤销",
        description: "上一步操作已撤销",
      });
    }
  };

  // 重做功能
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newValue = history[newIndex];
      setHistoryIndex(newIndex);
      onChange(newValue);
      toast({
        title: "已重做",
        description: "已恢复下一步操作",
      });
    }
  };

  // 保存到历史记录
  const saveToHistory = (newValue: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 导入功能
  const importRules = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onChange(content);
        saveToHistory(content);
        toast({
          title: "导入成功",
          description: `已从 ${file.name} 导入规则配置`,
        });
      };
      reader.readAsText(file);
    }
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 导出功能
  const exportRules = () => {
    const lines = value.split("\n");
    // 过滤掉注释行和空行
    const rules = lines.filter((line: string) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("#");
    });
    const quotedRules = rules.map((rule: string) => `"${rule}"`);
    const exportedContent = quotedRules.join("\n");

    const blob = new Blob([exportedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clash-rules-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "导出成功",
      description: `已导出 ${rules.length} 条规则到文件（已过滤注释行）`,
    });
  };

  // 计算规则数量
  const getRuleCount = () => {
    if (ruleCount !== undefined) return ruleCount;
    return value.split("\n").filter((line) =>
      line.trim() && !line.trim().startsWith("#")
    ).length;
  };

  // 检查是否有错误
  const hasValidationErrors = () => {
    if (hasError !== undefined) return hasError;
    return false;
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border border-border overflow-hidden bg-card rounded-none",
        "hover:shadow-sm transition-all duration-200",
        "focus-within:ring-1 focus-within:ring-ring/30 focus-within:border-ring/50",
        className,
      )}
    >
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-4">
          {/* 规则配置信息 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              规则配置
            </span>
            {/* 行数统计/规则统计 */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs rounded-md">
                {lineCount} 行 / {getRuleCount()} 条规则
              </Badge>
              {hasValidationErrors()
                ? (
                  <Badge variant="destructive" className="text-xs rounded-md">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errorCount || 0} 个问题
                  </Badge>
                )
                : (
                  <Badge
                    variant="outline"
                    className="text-xs text-green-600 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 rounded-md"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    有效
                  </Badge>
                )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 编辑功能按钮 */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="h-7 w-7 p-0 rounded-md"
              title="撤销"
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="h-7 w-7 p-0 rounded-md"
              title="重做"
            >
              <Redo className="h-3 w-3" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={importRules}
              className="h-7 w-7 p-0 rounded-md"
              title="导入"
            >
              <Upload className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportRules}
              className="h-7 w-7 p-0 rounded-md"
              title="导出"
            >
              <Download className="h-3 w-3" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.conf"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 编辑器主体区域 */}
      <div className="flex-1 relative min-h-0">
        {/* CodeMirror 6 编辑器 */}
        <div
          ref={editorRef}
          className="w-full h-full overflow-auto"
          style={{
            fontSize: "14px",
            fontFamily: "var(--font-mono)",
            maxHeight: "100%",
          }}
        />
      </div>
    </div>
  );
}
