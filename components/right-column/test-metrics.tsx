"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";

interface TestMetrics {
    totalTests: number;
    averageTime: number;
    successRate: number; // 以百分比形式存储，0 表示 0%
    lastTestTime: number;
}

interface TestMetricsProps {
    testMetrics: TestMetrics;
    onExportTestHistory: () => void;
    onClearTestHistory: () => void;
}

export function TestMetrics({
    testMetrics,
    onExportTestHistory,
    onClearTestHistory,
}: TestMetricsProps) {
    // 客户端状态管理，避免 SSR 不一致
    const [displayMetrics, setDisplayMetrics] = useState<TestMetrics>({
        totalTests: 0,
        averageTime: 0,
        successRate: 0,
        lastTestTime: 0,
    });
    const [isClient, setIsClient] = useState(false);

    // 在客户端更新指标
    useEffect(() => {
        setIsClient(true);
        setDisplayMetrics(testMetrics);
    }, [testMetrics]);

    // 如果还在服务端渲染，使用默认指标
    const metrics = isClient ? displayMetrics : {
        totalTests: 0,
        averageTime: 0,
        successRate: 0,
        lastTestTime: 0,
    };

    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                        测试指标
                    </h3>
                </div>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <div className="text-muted-foreground">总测试数</div>
                        <div className="font-semibold">
                            {metrics.totalTests}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">平均耗时</div>
                        <div className="font-semibold">
                            {metrics.averageTime.toFixed(2)}ms
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">成功率</div>
                        <div className="font-semibold">
                            {metrics.successRate.toFixed(1)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">最近耗时</div>
                        <div className="font-semibold">
                            {metrics.lastTestTime.toFixed(2)}ms
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExportTestHistory}
                        className="flex-1 bg-transparent rounded-md"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        导出历史
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearTestHistory}
                        className="flex-1 bg-transparent rounded-md"
                        disabled={testMetrics.totalTests === 0}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        清除历史
                    </Button>
                </div>
            </div>
        </div>
    );
}
