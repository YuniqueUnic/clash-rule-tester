"use client";

import { ClashRuleEditor } from "@/components/clash-rule-editor/clash-rule-editor-v2";

interface RuleEditorProps {
    rules: string;
    onRulesChange: (rules: string) => void;
    highlightedLine?: number;
    /** AI 优化状态 */
    isAIOptimizing?: boolean;
    /** 停止 AI 优化的回调 */
    onStopAIOptimization?: () => void;
}

/**
 * 规则编辑器组件
 * 使用重构后的 ClashRuleEditor，自动获取真实数据
 */
export function RuleEditor({
    rules,
    onRulesChange,
    highlightedLine,
    isAIOptimizing = false,
    onStopAIOptimization,
}: RuleEditorProps) {
    return (
        <div className="h-full flex flex-col">
            <ClashRuleEditor
                value={rules}
                onChange={onRulesChange}
                highlightedLine={highlightedLine}
                className="flex-1"
                minHeight={200}
                maxHeight={99999} // 移除高度限制，让编辑器填满容器
                isAIOptimizing={isAIOptimizing}
                onStopAIOptimization={onStopAIOptimization}
                placeholder="# 在此输入 Clash 规则
# 例如：
DOMAIN-SUFFIX,google.com,PROXY
DOMAIN-SUFFIX,github.com,DIRECT
GEOIP,CN,DIRECT
MATCH,PROXY"
            />
        </div>
    );
}
