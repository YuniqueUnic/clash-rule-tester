"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CLASH_RULE_TYPES } from "@/lib/clash-data-sources";

interface Policy {
    id: string;
    name: string;
    comment?: string;
}

interface QuickRuleCreatorProps {
    policies: Policy[];
    onAddRule: (ruleType: string, content: string, policy: string) => void;
}

export function QuickRuleCreator(
    { policies, onAddRule }: QuickRuleCreatorProps,
) {
    const [newRuleType, setNewRuleType] = useState("");
    const [newRuleContent, setNewRuleContent] = useState("");
    const [newRulePolicy, setNewRulePolicy] = useState("");
    const { toast } = useToast();

    const addQuickRule = () => {
        if (newRuleType && newRuleContent && newRulePolicy) {
            onAddRule(newRuleType, newRuleContent, newRulePolicy);
            setNewRuleType("");
            setNewRuleContent("");
            setNewRulePolicy("");
            toast({
                title: "规则已添加",
                description: "新规则已添加到配置中。",
            });
        }
    };

    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Plus className="h-4 w-4" />
                    快速规则构建器
                </h3>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Label
                            htmlFor="rule-type"
                            className="text-foreground text-sm min-w-[80px]"
                        >
                            规则类型
                        </Label>
                        <Select
                            value={newRuleType}
                            onValueChange={setNewRuleType}
                        >
                            <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md flex-1">
                                <SelectValue placeholder="选择规则类型" />
                            </SelectTrigger>
                            <SelectContent>
                                {CLASH_RULE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Label
                            htmlFor="rule-content"
                            className="text-foreground text-sm min-w-[60px]"
                        >
                            内容
                        </Label>
                        <Input
                            id="rule-content"
                            value={newRuleContent}
                            onChange={(e) => setNewRuleContent(e.target.value)}
                            placeholder="例如：google.com"
                            className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Label
                            htmlFor="rule-policy"
                            className="text-foreground text-sm min-w-[60px]"
                        >
                            策略
                        </Label>
                        <Select
                            value={newRulePolicy}
                            onValueChange={setNewRulePolicy}
                        >
                            <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md flex-1">
                                <SelectValue placeholder="选择策略" />
                            </SelectTrigger>
                            <SelectContent>
                                {policies.map((policy) => (
                                    <SelectItem key={policy.id} value={policy.name}>
                                        {policy.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button
                    onClick={addQuickRule}
                    className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 rounded-md"
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    添加规则
                </Button>
            </div>
        </div>
    );
}
