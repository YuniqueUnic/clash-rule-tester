"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { History, Timer } from "lucide-react";
import type { MatchResult, TestRequest } from "@/lib/clash-rule-engine";

interface TestHistory {
    id: string;
    timestamp: number;
    request: TestRequest;
    result: MatchResult | null;
    duration: number;
}

interface TestHistoryProps {
    testHistory: TestHistory[];
}

export function TestHistory({ testHistory }: TestHistoryProps) {
    // 客户端状态管理，避免 SSR 不一致
    const [displayHistory, setDisplayHistory] = useState<TestHistory[]>([]);
    const [isClient, setIsClient] = useState(false);

    // 在客户端更新历史记录
    useEffect(() => {
        setIsClient(true);
        setDisplayHistory(testHistory);
    }, [testHistory]);

    // 如果还在服务端渲染，使用空数组
    const history = isClient ? displayHistory : [];

    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <History className="h-4 w-4" />
                    测试历史
                </h3>
            </div>
            <div className="p-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.length === 0
                        ? (
                            <div className="text-center text-muted-foreground text-sm py-8">
                                暂无测试历史
                            </div>
                        )
                        : (
                            history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-muted-foreground">
                                            {new Date(entry.timestamp)
                                                .toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    second: "2-digit",
                                                })}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Timer className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {entry.duration.toFixed(2)}ms
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {entry.request.domain && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs h-4"
                                                >
                                                    {entry.request.domain}
                                                </Badge>
                                            )}
                                            {entry.request.dstPort && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs h-4"
                                                >
                                                    :{entry.request.dstPort}
                                                </Badge>
                                            )}
                                            {entry.request.process && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs h-4"
                                                >
                                                    {entry.request.process}
                                                </Badge>
                                            )}
                                        </div>
                                        {entry.result && (
                                            <Badge
                                                variant={entry.result.policy ===
                                                        "DIRECT"
                                                    ? "default"
                                                    : entry.result.policy ===
                                                            "PROXY"
                                                    ? "secondary"
                                                    : "destructive"}
                                                className="text-xs h-4"
                                            >
                                                {entry.result.policy}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                </div>
            </div>
        </div>
    );
}
