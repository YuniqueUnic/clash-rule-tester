"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Check,
    Download,
    Plus,
    Settings,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Policy {
    id: string;
    name: string;
    comment?: string;
    createdAt?: number; // 添加创建时间字段
}

interface PolicyManagerProps {
    policies: Policy[];
    onAddPolicy: (name: string, comment?: string) => void;
    onUpdatePolicy: (id: string, name: string, comment?: string) => void;
    onDeletePolicy: (id: string) => void;
    onImportPolicies: () => void;
    onExportPolicies: () => void;
}

// 客户端安全的时间显示组件
function ClientTimeDisplay({ timestamp }: { timestamp: number }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <span className="text-muted-foreground">--:--:--</span>;
    }

    return (
        <span className="text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })}
        </span>
    );
}

export function PolicyManager({
    policies,
    onAddPolicy,
    onUpdatePolicy,
    onDeletePolicy,
    onImportPolicies,
    onExportPolicies,
}: PolicyManagerProps) {
    const [newPolicyName, setNewPolicyName] = useState("");
    const [newPolicyComment, setNewPolicyComment] = useState("");
    const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
    const { toast } = useToast();

    const addPolicy = () => {
        const trimmedName = newPolicyName.trim();
        if (trimmedName) {
            // 检查是否已存在相同名称的策略（大小写敏感）
            const existingPolicy = policies.find((p) => p.name === trimmedName);
            if (existingPolicy) {
                toast({
                    title: "策略已存在",
                    description:
                        `策略名称 "${trimmedName}" 已存在，请使用不同的名称。`,
                    variant: "destructive",
                });
                return;
            }

            onAddPolicy(trimmedName, newPolicyComment.trim() || undefined);
            setNewPolicyName("");
            setNewPolicyComment("");
            toast({
                title: "策略已添加",
                description: `策略 "${trimmedName}" 已添加。`,
            });
        }
    };

    const updatePolicy = (id: string, name: string, comment?: string) => {
        const trimmedName = name.trim();
        const trimmedComment = comment?.trim();

        // 检查是否与其他策略重名（排除当前编辑的策略）
        const existingPolicy = policies.find((p) =>
            p.id !== id && p.name === trimmedName
        );
        if (existingPolicy) {
            toast({
                title: "策略已存在",
                description:
                    `策略名称 "${trimmedName}" 已存在，请使用不同的名称。`,
                variant: "destructive",
            });
            return;
        }

        onUpdatePolicy(id, trimmedName, trimmedComment || undefined);
        setEditingPolicy(null);
        toast({
            title: "策略已更新",
            description: `策略 "${trimmedName}" 已更新。`,
        });
    };

    const deletePolicy = (id: string) => {
        onDeletePolicy(id);
        toast({
            title: "策略已删除",
            description: "策略已从列表中删除。",
        });
    };

    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Settings className="h-4 w-4" />
                    策略管理
                </h3>
            </div>
            <div className="p-4 space-y-4">
                {/* Add New Policy */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="策略名称"
                            value={newPolicyName}
                            onChange={(e) => setNewPolicyName(e.target.value)}
                            className="flex-1 rounded-md"
                        />
                        <Button
                            onClick={addPolicy}
                            size="sm"
                            disabled={!newPolicyName.trim()}
                            className="rounded-md"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <Input
                        placeholder="策略注释（可选）"
                        value={newPolicyComment}
                        onChange={(e) => setNewPolicyComment(e.target.value)}
                        className="text-xs rounded-md"
                    />
                </div>

                {/* Policy List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {policies.map((policy) => (
                        <div
                            key={policy.id}
                            className="p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
                        >
                            {editingPolicy === policy.id
                                ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="策略名称"
                                                value={newPolicyName}
                                                onChange={(e) =>
                                                    setNewPolicyName(
                                                        e.target.value,
                                                    )}
                                                className="flex-1 text-xs"
                                            />
                                            <Button
                                                onClick={() =>
                                                    updatePolicy(
                                                        policy.id,
                                                        newPolicyName,
                                                        newPolicyComment,
                                                    )}
                                                size="sm"
                                                disabled={!newPolicyName.trim()}
                                                className="h-6 px-2"
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    setEditingPolicy(null)}
                                                size="sm"
                                                variant="outline"
                                                className="h-6 px-2"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="策略注释（可选）"
                                            value={newPolicyComment}
                                            onChange={(e) =>
                                                setNewPolicyComment(
                                                    e.target.value,
                                                )}
                                            className="text-xs"
                                        />
                                    </div>
                                )
                                : (
                                    <>
                                        <div className="flex items-center justify-between mb-1">
                                            <ClientTimeDisplay
                                                timestamp={policy.createdAt ||
                                                    Number(policy.id)}
                                            />
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    onClick={() => {
                                                        setEditingPolicy(
                                                            policy.id,
                                                        );
                                                        setNewPolicyName(
                                                            policy.name,
                                                        );
                                                        setNewPolicyComment(
                                                            policy.comment ||
                                                                "",
                                                        );
                                                    }}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 w-5 p-0 hover:bg-accent"
                                                >
                                                    <Settings className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        deletePolicy(policy.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 w-5 p-0 hover:bg-destructive/20"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono">
                                                {policy.name}
                                            </span>
                                            {policy.comment && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs h-4"
                                                >
                                                    {policy.comment}
                                                </Badge>
                                            )}
                                        </div>
                                    </>
                                )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 bg-transparent rounded-md"
                        size="sm"
                        onClick={onImportPolicies}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        导入策略
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 bg-transparent rounded-md"
                        size="sm"
                        onClick={onExportPolicies}
                        disabled={policies.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        导出策略
                    </Button>
                </div>
            </div>
        </div>
    );
}
