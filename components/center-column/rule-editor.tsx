"use client";

import { ClashRuleEditor } from "@/components/clash-rule-editor/clash-rule-editor-v2";

interface RuleEditorProps {
    rules: string;
    onRulesChange: (rules: string) => void;
    highlightedLine?: number;
}

/**
 * 规则编辑器组件
 * 使用重构后的 ClashRuleEditor，自动获取真实数据
 */
export function RuleEditor({
    rules,
    onRulesChange,
    highlightedLine,
}: RuleEditorProps) {
    return (
        <div className="h-full">
            <ClashRuleEditor
                value={rules}
                onChange={onRulesChange}
                highlightedLine={highlightedLine}
                className="h-full"
                minHeight={300}
                maxHeight={800}
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
