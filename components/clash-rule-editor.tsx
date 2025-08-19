"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ClashRuleEditorProps {
  value: string
  onChange: (value: string) => void
  highlightedLine?: number
  className?: string
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
]

const CLASH_POLICIES = ["DIRECT", "PROXY", "REJECT", "PASS"]

export function ClashRuleEditor({ value, onChange, highlightedLine, className }: ClashRuleEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    const lines = value.split("\n").length
    setLineCount(lines)
  }, [value])

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  const highlightSyntax = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, index) => {
      const lineNumber = index + 1
      const isHighlighted = highlightedLine === lineNumber
      const trimmedLine = line.trim()

      // Skip empty lines
      if (!trimmedLine) {
        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            )}
          >
            <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
              {lineNumber}
            </span>
            <span className="flex-1 px-2">&nbsp;</span>
          </div>
        )
      }

      // Comment lines
      if (trimmedLine.startsWith("#")) {
        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            )}
          >
            <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
              {lineNumber}
            </span>
            <span className="flex-1 px-2 text-green-600 dark:text-green-400 italic opacity-75">{line}</span>
          </div>
        )
      }

      // Parse rule line
      const parts = line.split(",")
      if (parts.length >= 2) {
        const [ruleType, content, ...rest] = parts.map((p) => p.trim())
        const policy = rest.join(",").trim()

        const isValidRuleType = CLASH_RULE_TYPES.includes(ruleType)
        const isValidPolicy = !policy || CLASH_POLICIES.includes(policy) || policy.match(/^[A-Z][A-Z0-9_-]*$/)
        const hasError = !isValidRuleType || !isValidPolicy

        return (
          <div
            key={index}
            className={cn(
              "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
              isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
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
                  isValidRuleType ? getRuleTypeColor(ruleType) : "text-red-600 dark:text-red-400",
                )}
              >
                {ruleType}
              </span>
              <span className="text-muted-foreground/70">,</span>
              <span className="text-foreground/90 mx-1">{content}</span>
              {policy && (
                <>
                  <span className="text-muted-foreground/70">,</span>
                  <span
                    className={cn(
                      "font-medium ml-1",
                      isValidPolicy ? getPolicyColor(policy) : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {policy}
                  </span>
                </>
              )}
              {hasError && (
                <span className="ml-2 text-xs text-red-500 dark:text-red-400 opacity-75">
                  ⚠ {!isValidRuleType && "Invalid rule type"}
                  {!isValidRuleType && !isValidPolicy && " • "}
                  {!isValidPolicy && "Invalid policy"}
                </span>
              )}
            </span>
          </div>
        )
      }

      // Invalid or incomplete rule
      return (
        <div
          key={index}
          className={cn(
            "flex min-h-[24px] hover:bg-accent/5 transition-colors duration-150 group",
            isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500",
            trimmedLine && "bg-amber-50/50 dark:bg-amber-950/20",
          )}
        >
          <span className="w-12 px-2 text-right text-xs text-muted-foreground/60 select-none font-mono">
            {lineNumber}
          </span>
          <span className="flex-1 px-2 text-amber-700 dark:text-amber-300 font-mono text-sm">{line}</span>
          {trimmedLine && (
            <span className="text-xs text-amber-600 dark:text-amber-400 px-2 self-center opacity-75">⚠ Incomplete</span>
          )}
        </div>
      )
    })
  }

  const getRuleTypeColor = (ruleType: string): string => {
    if (["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-REGEX", "GEOSITE"].includes(ruleType)) {
      return "text-blue-600 dark:text-blue-400"
    }
    if (["IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "SRC-IP-CIDR"].includes(ruleType)) {
      return "text-purple-600 dark:text-purple-400"
    }
    if (["PROCESS-NAME", "PROCESS-PATH", "PROCESS-PATH-REGEX"].includes(ruleType)) {
      return "text-emerald-600 dark:text-emerald-400"
    }
    if (["DST-PORT", "SRC-PORT", "IN-PORT"].includes(ruleType)) {
      return "text-orange-600 dark:text-orange-400"
    }
    if (["AND", "OR", "NOT"].includes(ruleType)) {
      return "text-indigo-600 dark:text-indigo-400 font-bold"
    }
    if (["RULE-SET", "SUB-RULE"].includes(ruleType)) {
      return "text-cyan-600 dark:text-cyan-400"
    }
    if (ruleType === "MATCH") {
      return "text-gray-600 dark:text-gray-400 font-bold"
    }
    return "text-slate-600 dark:text-slate-400"
  }

  const getPolicyColor = (policy: string): string => {
    switch (policy) {
      case "DIRECT":
        return "text-green-600 dark:text-green-400"
      case "PROXY":
        return "text-blue-600 dark:text-blue-400"
      case "REJECT":
        return "text-red-600 dark:text-red-400"
      case "PASS":
        return "text-yellow-600 dark:text-yellow-400"
      default:
        return "text-indigo-600 dark:text-indigo-400"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = value.substring(0, start) + "  " + value.substring(end)
      onChange(newValue)

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  return (
    <div
      className={cn(
        "relative h-full border border-border rounded-lg overflow-hidden bg-card",
        "hover:shadow-sm transition-all duration-200",
        "focus-within:ring-1 focus-within:ring-ring/30 focus-within:border-ring/50",
        className,
      )}
    >
      <div
        ref={highlightRef}
        className="absolute inset-0 overflow-auto font-mono text-sm leading-6 pointer-events-none whitespace-pre-wrap break-words"
        style={{
          padding: "12px 12px 12px 0",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div className="min-h-full">{highlightSyntax(value)}</div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className={cn(
          "absolute inset-0 w-full h-full font-mono text-sm leading-6 resize-none outline-none",
          "bg-transparent text-transparent caret-foreground",
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
      />

      <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs text-muted-foreground/80 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border/50 shadow-sm">
        <span className="font-mono">{lineCount} 行</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="font-mono">
          {value.split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length} 规则
        </span>
      </div>
    </div>
  )
}
