"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, HelpCircle, Loader2, Play, Sparkles } from "lucide-react";
import type { MatchResult } from "@/lib/clash-rule-engine";
import { useIsMobile } from "@/hooks/use-mobile";

interface TestResultProps {
    matchResult: MatchResult | null;
    matchResultExpanded: boolean;
    onToggleExpanded: () => void;
    isTestingInProgress: boolean;
    ruleExplanation: string;
    isExplaining: boolean;
    onExplainRule: () => void;
    aiConfigured: boolean;
}

export function TestResult({
    matchResult,
    matchResultExpanded,
    onToggleExpanded,
    isTestingInProgress,
    ruleExplanation,
    isExplaining,
    onExplainRule,
    aiConfigured,
}: TestResultProps) {
    const isMobile = useIsMobile();

    return (
        <div className="h-full flex flex-col">
            {/* 固定的标题栏 */}
            <div className="p-3 border-b border-border bg-muted/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {matchResult
                            ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-foreground">
                                        匹配结果
                                    </span>
                                    <Badge
                                        variant={matchResult.policy === "DIRECT"
                                            ? "default"
                                            : matchResult.policy === "PROXY"
                                            ? "secondary"
                                            : "destructive"}
                                        className="text-xs rounded-md font-semibold"
                                    >
                                        {matchResult.policy}
                                    </Badge>
                                    <span className="text-muted-foreground text-sm">
                                        代码 line {matchResult.lineNumber}{" "}
                                        / 匹配规则：{matchResult.rule}
                                    </span>
                                </>
                            )
                            : (
                                <>
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">
                                        匹配结果
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-xs rounded-md"
                                    >
                                        等待测试
                                    </Badge>
                                </>
                            )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isTestingInProgress && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                测试中...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                    {matchResult
                        ? (
                            <div className="p-3 bg-muted/40 rounded-lg border border-muted hover:bg-muted/60 transition-colors">
                                <div className="flex items-start gap-2 mb-2">
                                    <div className="font-medium text-sm text-foreground">
                                        详细匹配信息
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="p-2 bg-background/80 rounded-md border border-border/50">
                                        <div className="text-foreground/90 leading-relaxed text-xs">
                                            {matchResult
                                                .detailedExplanation}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1 mt-2">
                                        {matchResult.matchedContent && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground font-medium">
                                                    匹配内容：
                                                </span>
                                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                                    {matchResult
                                                        .matchedContent}
                                                </code>
                                            </div>
                                        )}
                                        {matchResult.matchPosition && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground font-medium">
                                                    匹配位置：
                                                </span>
                                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                                    {matchResult
                                                        .matchPosition}
                                                </code>
                                            </div>
                                        )}
                                        {matchResult.matchRange && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground font-medium">
                                                    覆盖范围：
                                                </span>
                                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                                    {matchResult.matchRange}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                        : (
                            <div className="p-3 bg-muted/40 rounded-lg border border-muted hover:bg-muted/60 transition-colors">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Play className="h-4 w-4" />
                                    <span className="text-sm">
                                        等待测试结果...
                                    </span>
                                </div>
                            </div>
                        )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 hover:bg-accent/80 rounded-md border border-border/50"
                        onClick={onExplainRule}
                        disabled={!aiConfigured || isExplaining}
                    >
                        {isExplaining
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <HelpCircle className="h-4 w-4 mr-2" />}
                        AI 深度解释规则
                    </Button>

                    {ruleExplanation && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-sm transition-all duration-200">
                            <div className="flex items-start gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                                    AI 解释
                                </div>
                            </div>
                            <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
                                {ruleExplanation}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
