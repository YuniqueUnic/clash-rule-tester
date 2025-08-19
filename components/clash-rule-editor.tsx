"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ClashRuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  highlightedLine?: number;
  className?: string;
  ruleCount?: number;
  hasError?: boolean;
  errorCount?: number;
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

export function ClashRuleEditor({
  value,
  onChange,
  highlightedLine,
  className,
  ruleCount,
  hasError,
  errorCount,
}: ClashRuleEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const lines = value.split("\n").length;
    setLineCount(lines);
  }, [value]);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

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
            <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
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
            <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
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
            <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
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
          <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = localValue.substring(0, start) + "  " +
        localValue.substring(end);
      setLocalValue(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current
              .selectionEnd =
              start + 2;
        }
      }, 0);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setLocalValue(value);
  };

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
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

        {isEditing
          ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              className="h-7 rounded-md px-2 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              保存
            </Button>
          )
          : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              className="h-7 rounded-md px-2 text-xs bg-background/95 backdrop-blur-sm border-border/50 shadow-sm"
            >
              <Pencil className="h-3 w-3 mr-1" />
              编辑
            </Button>
          )}
      </div>

      {/* 编辑器主体区域 */}
      <div className="flex-1 relative">
        <div
          ref={highlightRef}
          className={cn(
            "absolute inset-0 overflow-auto font-mono text-sm leading-6 pointer-events-none whitespace-pre-wrap break-words",
            "p-3 pl-0 pr-3",
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="min-h-full">
            {highlightSyntax(isEditing ? localValue : value, isEditing)}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={isEditing ? localValue : value}
          onChange={(e) =>
            isEditing
              ? setLocalValue(e.target.value)
              : onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute inset-0 w-full h-full font-mono text-sm leading-6 resize-none outline-none",
            "bg-transparent caret-foreground",
            // 在非编辑模式下隐藏文本
            !isEditing && "text-transparent",
            // 在编辑模式下确保文本可见
            isEditing && "text-foreground",
            "p-3 pl-12 pr-4",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30",
          )}
          style={{
            caretColor: "hsl(var(--foreground))",
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="输入您的 CLASH 规则配置..."
          aria-label="CLASH 规则编辑器"
          readOnly={!isEditing}
        />
      </div>
    </div>
  );
}
