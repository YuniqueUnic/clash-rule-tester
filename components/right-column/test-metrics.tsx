"use client";

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
                            {testMetrics.totalTests}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">平均耗时</div>
                        <div className="font-semibold">
                            {testMetrics.averageTime.toFixed(2)}ms
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">成功率</div>
                        <div className="font-semibold">
                            {testMetrics.successRate.toFixed(1)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">最近耗时</div>
                        <div className="font-semibold">
                            {testMetrics.lastTestTime.toFixed(2)}ms
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
