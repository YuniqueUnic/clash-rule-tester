"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Redo, Save, Undo, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// CodeMirror 6 imports
import {
  Decoration,
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

// Clash 规则语法高亮器
// 这的 d 规则语法高亮器写得有问题：
// 1. 第一个逗号前的部分应该是规则类型，这里应该使用 tags.keyword
// 2. 逗号应该使用 tags.punctuation
// 3. 第二个逗号前的部分应该是用户自定的内容
// 4. 逗号
// 5. 策略名称
// 但是只有 MATCH 这个规则类型特殊一点，MATCH，策略名称 这样的格了
const createClashLanguage = (policies: string[] = ["DIRECT", "PROXY", "REJECT", "PASS"]) => StreamLanguage.define({
  token(stream: StringStream, state: any) {
    const line = stream.string;

    // 跳过空白字符
    if (stream.eatSpace()) return null;

    // 注释
    if (stream.match(/^#.*/)) {
      return "comment";
    }

    // 解析当前行的结构
    const currentPos = stream.pos;
    const comma1 = line.indexOf(",", currentPos);
    const comma2 = comma1 !== -1 ? line.indexOf(",", comma1 + 1) : -1;

    // 第一部分：规则类型 (keyword)
    if (currentPos === 0 && comma1 !== -1) {
      stream.pos = comma1;
      return "keyword";
    }

    // 第一个逗号
    if (stream.eat(",")) {
      return "punctuation";
    }

    // 第二部分：内容 (string)
    if (comma1 !== -1 && currentPos === comma1 + 1 && comma2 !== -1) {
      stream.pos = comma2;
      return "string";
    }

    // 第二个逗号
    if (stream.eat(",")) {
      return "punctuation";
    }

    // 第三部分：策略 (constant) - 使用真实策略数据
    if (comma2 !== -1 && currentPos === comma2 + 1) {
      const remaining = line.substring(comma2 + 1).trim();
      if (remaining) {
        // 检查是否是已知的策略
        const policyPattern = new RegExp(`^(${policies.join("|")}|DIRECT|PROXY|REJECT|PASS)$`, "i");
        if (policyPattern.test(remaining) || /^[A-Z][A-Z0-9_-]*$/.test(remaining)) {
          stream.skipToEnd();
          return "constant";
        }
      }
    }

    // 策略名称匹配
    const policyPattern = new RegExp(`^(${policies.join("|")}|DIRECT|PROXY|REJECT|PASS)$`, "i");
    if (policyPattern.test(stream.current())) {
      return "constant";
    }

    // 其他内容作为字符串
    if (stream.match(/^[a-zA-Z0-9._\-\/:]+/)) {
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

// 动态 Clash 规则语法高亮样式，根据主题自动调整
const clashHighlightStyle = HighlightStyle.define([
  // 注释 - 使用 muted-foreground 色，斜体
  {
    tag: tags.comment,
    color: "hsl(var(--muted-foreground))",
    fontStyle: "italic",
  },

  // 规则类型关键字 - 使用 destructive 色，粗体
  { tag: tags.keyword, color: "hsl(var(--destructive))", fontWeight: "bold" },

  // 字符串内容 - 使用 success 色
  { tag: tags.string, color: "hsl(var(--success))" },

  // 常量值 - 使用 info 色，粗体
  {
    tag: tags.constant(tags.variableName),
    color: "hsl(var(--info))",
    fontWeight: "bold",
  },
  { tag: tags.literal, color: "hsl(var(--info))" },
  { tag: tags.number, color: "hsl(var(--info))" },

  // 运算符和标点 - 使用 muted-foreground 色
  { tag: tags.operator, color: "hsl(var(--muted-foreground))" },
  { tag: tags.punctuation, color: "hsl(var(--muted-foreground))" },

  // 变量名 - 使用 foreground 色
  { tag: tags.variableName, color: "hsl(var(--foreground))" },

  // 类型名 - 使用 primary 色
  { tag: tags.typeName, color: "hsl(var(--primary))" },
  { tag: tags.className, color: "hsl(var(--primary))" },

  // 函数名 - 使用 warning 色
  { tag: tags.function(tags.variableName), color: "hsl(var(--warning))" },

  // 属性名 - 使用 muted-foreground 色
  { tag: tags.propertyName, color: "hsl(var(--muted-foreground))" },

  // 定义 - 使用 foreground 色，粗体
  {
    tag: tags.definition(tags.variableName),
    color: "hsl(var(--foreground))",
    fontWeight: "bold",
  },
]);

// 动态语法高亮器，适配当前主题

// 创建动态错误检测器
const createClashLinter = (
  policies: string[],
  geoIPCountries: string[],
  networkTypes: string[],
) =>
  linter((view) => {
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
      const validRuleTypes = [
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
        "AND",
        "OR",
        "NOT",
        "RULE-SET",
        "SUB-RULE",
        "NETWORK",
        "UID",
        "IN-TYPE",
        "MATCH",
      ];

      if (!validRuleTypes.includes(ruleType)) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from + line.indexOf(ruleType),
          to: view.state.doc.line(index + 1).from + line.indexOf(ruleType) +
            ruleType.length,
          severity: "error",
          message: `无效的规则类型：${ruleType}`,
          source: "clash-rule-linter",
        });
      }

      if (policy) {
        const validPolicies = [
          "DIRECT",
          "PROXY",
          "REJECT",
          "PASS",
          ...policies,
        ];
        const isValidPolicy = validPolicies.includes(policy) ||
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
            if (!geoIPCountries.includes(content.toUpperCase())) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "warning",
                message: `未知的国家代码：${content}，建议使用标准国家代码`,
                source: "clash-rule-linter",
              });
            }
            break;

          case "NETWORK":
            if (!networkTypes.includes(content.toUpperCase())) {
              diagnostics.push({
                from: view.state.doc.line(index + 1).from +
                  line.indexOf(content),
                to: view.state.doc.line(index + 1).from +
                  line.indexOf(content) + content.length,
                severity: "warning",
                message: `未知的网络类型：${content}`,
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
            // 简单的域名格式验证
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
        }
      }
    });

    return diagnostics;
  });

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
) =>
  autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;

        const completions = [
          // 规则类型
          ...CLASH_RULE_TYPES.map((type) => ({ label: type, type: "keyword" })),
          // 策略 - 从真实环境获取
          ...policies.map((policy) => ({ label: policy, type: "constant" })),
          // GeoIP 国家代码 - 从真实环境获取
          ...geoIPCountries.map((country) => ({
            label: country,
            type: "constant",
          })),
          // 网络类型 - 从真实环境获取
          ...networkTypes.map((network) => ({
            label: network,
            type: "constant",
          })),
          // 常见域名后缀
          { label: "google.com", type: "text" },
          { label: "github.com", type: "text" },
          { label: "youtube.com", type: "text" },
          { label: "facebook.com", type: "text" },
          { label: "twitter.com", type: "text" },
          // 常见端口
          { label: "80", type: "number" },
          { label: "443", type: "number" },
          { label: "8080", type: "number" },
          // 常见进程名
          { label: "chrome.exe", type: "text" },
          { label: "firefox.exe", type: "text" },
          { label: "system", type: "text" },
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

// 行高亮装饰器 - 高亮整行
const lineHighlight = (lineNumber: number) => {
  return EditorView.decorations.of((view: EditorView) => {
    const builder = new RangeSetBuilder<Decoration>();
    const state = view.state;
    const doc = state.doc;

    if (lineNumber && lineNumber <= doc.lines && lineNumber > 0) {
      try {
        const line = doc.line(lineNumber);
        if (line && line.text !== undefined) {
          // 高亮整行，但不包括换行符
          const lineEnd = line.to - (line.number === doc.lines ? 0 : 1);
          builder.add(
            line.from,
            lineEnd,
            Decoration.mark({
              class: "bg-blue-100 dark:bg-blue-900/50",
              attributes: {
                style:
                  "background-color: rgba(59, 130, 246, 0.2); padding: 2px 0;",
              },
            }),
          );
        }
      } catch (error) {
        console.warn("Line highlight error:", error);
      }
    }

    return builder.finish();
  });
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
}: ClashRuleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const { toast } = useToast();

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

  // 初始化 CodeMirror 编辑器
  useEffect(() => {
    if (editorRef.current) {
      const state = EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          createClashLanguage(policies),
          syntaxHighlighting(clashHighlightStyle),
          keymap.of([indentWithTab, ...defaultKeymap]),
          createClashCompletion(policies, geoIPCountries, networkTypes),
          createClashLinter(policies, geoIPCountries, networkTypes),
          lintGutter(),
          dynamicDecorations,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString();
              onChange(newValue);
              saveToHistory(newValue);
            }
          }),
        ],
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      editorViewRef.current = view;

      return () => {
        view.destroy();
        editorViewRef.current = null;
      };
    }
  }, [highlightedLine, policies, geoIPCountries, networkTypes]);

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

  // 创建动态装饰器
  const dynamicDecorations = useMemo(() => {
    return highlightedLine
      ? lineHighlight(highlightedLine)
      : EditorView.decorations.of(() => Decoration.none);
  }, [highlightedLine]);

  const highlightSyntax = (text: string, isEditingMode: boolean = false) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      // 只在非编辑模式下应用高亮
      const isHighlighted = !isEditingMode && highlightedLine === lineNumber;
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted &&
                "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            )}
          >
            <span className="w-12 px-2 text-right text-xs text-muted-foreground select-none font-mono">
              {lineNumber}
            </span>
            <span className="flex-1 px-2">&nbsp;</span>
          </div>
        );
      }

      // Comment lines
      if (trimmedLine.startsWith("#")) {
        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted &&
                "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            )}
          >
            <span className="w-12 px-2 text-right text-xs text-muted-foreground select-none font-mono">
              {lineNumber}
            </span>
            <span
              className={cn(
                "flex-1 px-2 font-mono text-sm italic opacity-75",
                // 在编辑模式下使文本透明
                isEditingMode
                  ? "text-transparent"
                  : "text-green-600 dark:text-green-400",
              )}
            >
              {line}
            </span>
          </div>
        );
      }

      // Parse rule line
      const parts = line.split(",");
      if (parts.length >= 2) {
        const [ruleType, content, ...rest] = parts.map((p) => p.trim());
        const policy = rest.join(",").trim();

        const isValidRuleType = CLASH_RULE_TYPES.includes(ruleType);
        const isValidPolicy = !policy || CLASH_POLICIES.includes(policy) ||
          policy.match(/^[A-Z][A-Z0-9_-]*$/);
        const hasError = !isValidRuleType || !isValidPolicy;

        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted &&
                "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
              hasError && "bg-red-50/50 dark:bg-red-950/20",
            )}
          >
            <span className="w-12 px-2 text-right text-xs text-muted-foreground select-none font-mono">
              {lineNumber}
            </span>
            <span className="flex-1 px-2 font-mono text-sm">
              <span
                className={cn(
                  "font-semibold",
                  // 在编辑模式下使文本透明
                  isEditingMode
                    ? "text-transparent"
                    : (isValidRuleType
                      ? getRuleTypeColor(ruleType)
                      : "text-red-600 dark:text-red-400"),
                )}
              >
                {ruleType}
              </span>
              <span
                className={cn(
                  "text-muted-foreground/70",
                  isEditingMode && "text-transparent",
                )}
              >
                ,
              </span>
              <span
                className={cn(
                  "mx-1",
                  isEditingMode ? "text-transparent" : "text-foreground/90",
                )}
              >
                {content}
              </span>
              {policy && (
                <>
                  <span
                    className={cn(
                      "text-muted-foreground/70",
                      isEditingMode && "text-transparent",
                    )}
                  >
                    ,
                  </span>
                  <span
                    className={cn(
                      "font-medium ml-1",
                      isEditingMode
                        ? "text-transparent"
                        : (isValidPolicy
                          ? getPolicyColor(policy)
                          : "text-red-600 dark:text-red-400"),
                    )}
                  >
                    {policy}
                  </span>
                </>
              )}
              {hasError && !isEditingMode && (
                <span className="ml-2 text-xs text-red-500 dark:text-red-400 opacity-75">
                  ⚠ {!isValidRuleType && "Invalid rule type"}
                  {!isValidRuleType && !isValidPolicy && " • "}
                  {!isValidPolicy && "Invalid policy"}
                </span>
              )}
            </span>
          </div>
        );
      }

      // Invalid or incomplete rule
      return (
        <div
          key={index}
          className={cn(
            "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
            isHighlighted &&
              "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            trimmedLine && "bg-amber-50/50 dark:bg-amber-950/20",
          )}
        >
          <span className="w-12 px-2 text-right text-xs text-muted-foreground select-none font-mono">
            {lineNumber}
          </span>
          <span
            className={cn(
              "flex-1 px-2 font-mono text-sm",
              isEditingMode
                ? "text-transparent"
                : "text-amber-700 dark:text-amber-300",
            )}
          >
            {line}
          </span>
          {trimmedLine && !isEditingMode && (
            <span className="text-xs text-amber-600 dark:text-amber-400 px-2 self-center opacity-75">
              ⚠ Incomplete
            </span>
          )}
        </div>
      );
    });
  };

  const getRuleTypeColor = (ruleType: string): string => {
    if (
      ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-REGEX", "GEOSITE"]
        .includes(ruleType)
    ) {
      return "text-blue-600 dark:text-blue-400";
    }
    if (
      ["IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "SRC-IP-CIDR"].includes(
        ruleType,
      )
    ) {
      return "text-purple-600 dark:text-purple-400";
    }
    if (
      ["PROCESS-NAME", "PROCESS-PATH", "PROCESS-PATH-REGEX"].includes(ruleType)
    ) {
      return "text-emerald-600 dark:text-emerald-400";
    }
    if (["DST-PORT", "SRC-PORT", "IN-PORT"].includes(ruleType)) {
      return "text-orange-600 dark:text-orange-400";
    }
    if (["AND", "OR", "NOT"].includes(ruleType)) {
      return "text-indigo-600 dark:text-indigo-400 font-bold";
    }
    if (["RULE-SET", "SUB-RULE"].includes(ruleType)) {
      return "text-cyan-600 dark:text-cyan-400";
    }
    if (ruleType === "MATCH") {
      return "text-gray-600 dark:text-gray-400 font-bold";
    }
    return "text-slate-600 dark:text-slate-400";
  };

  const getPolicyColor = (policy: string): string => {
    switch (policy) {
      case "DIRECT":
        return "text-green-600 dark:text-green-400";
      case "PROXY":
        return "text-blue-600 dark:text-blue-400";
      case "REJECT":
        return "text-red-600 dark:text-red-400";
      case "PASS":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-indigo-600 dark:text-indigo-400";
    }
  };

  // CodeMirror 处理键盘事件，不需要额外的处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // CodeMirror 会处理键盘事件
  };

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
