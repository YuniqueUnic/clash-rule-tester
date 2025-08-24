"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Copy,
    Download,
    HelpCircle,
    Loader2,
    Play,
    Sparkles,
} from "lucide-react";
import type { MatchResult } from "@/lib/clash-rule-engine";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
    const { toast } = useToast();
    const [isExplanationExpanded, setIsExplanationExpanded] = useState(true);

    // 复制 AI 解释内容
    const copyExplanation = async () => {
        if (!ruleExplanation) return;

        try {
            await navigator.clipboard.writeText(ruleExplanation);
            toast({
                title: "复制成功",
                description: "AI 解释内容已复制到剪贴板",
            });
        } catch (error) {
            toast({
                title: "复制失败",
                description: "无法复制到剪贴板",
                variant: "destructive",
            });
        }
    };

    // 下载 AI 解释内容
    const downloadExplanation = () => {
        if (!ruleExplanation) return;

        const blob = new Blob([ruleExplanation], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clash-rule-explanation-${
            new Date().toISOString().slice(0, 19).replace(/:/g, "-")
        }.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "下载成功",
            description: "AI 解释内容已下载为 Markdown 文件",
        });
    };

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
                        <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-sm transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                                        AI 解释
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyExplanation}
                                        className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                                        title="复制内容"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={downloadExplanation}
                                        className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                                        title="下载为文件"
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setIsExplanationExpanded(
                                                !isExplanationExpanded,
                                            )}
                                        className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                                        title={isExplanationExpanded
                                            ? "收起"
                                            : "展开"}
                                    >
                                        {isExplanationExpanded
                                            ? <ChevronUp className="h-3 w-3" />
                                            : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                    </Button>
                                </div>
                            </div>
                            {isExplanationExpanded && (
                                <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed prose prose-sm prose-blue dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                        components={{
                                            // 自定义组件样式
                                            h1: ({ children }) => (
                                                <h1 className="text-lg font-bold mb-2">
                                                    {children}
                                                </h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-base font-semibold mb-2">
                                                    {children}
                                                </h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-sm font-medium mb-1">
                                                    {children}
                                                </h3>
                                            ),
                                            p: ({ children }) => (
                                                <p className="mb-2 last:mb-0">
                                                    {children}
                                                </p>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc list-inside mb-2 space-y-1">
                                                    {children}
                                                </ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal list-inside mb-2 space-y-1">
                                                    {children}
                                                </ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="text-sm">
                                                    {children}
                                                </li>
                                            ),
                                            code: ({ children, className }) => {
                                                const isInline = !className;
                                                return isInline
                                                    ? (
                                                        <code className="bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded text-xs font-mono">
                                                            {children}
                                                        </code>
                                                    )
                                                    : (
                                                        <code
                                                            className={className}
                                                        >
                                                            {children}
                                                        </code>
                                                    );
                                            },
                                            pre: ({ children }) => (
                                                <pre className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-2 border-blue-300 pl-3 italic mb-2">
                                                    {children}
                                                </blockquote>
                                            ),
                                        }}
                                    >
                                        {ruleExplanation}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
