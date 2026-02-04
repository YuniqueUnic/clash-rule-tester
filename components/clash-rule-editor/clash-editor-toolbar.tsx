"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlignLeft,
  Copy,
  Download,
  FileText,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_IMPORT_OPTIONS,
  ExportOptions,
  exportRules,
  getRuleStats,
  ImportOptions,
  importRulesFromFile,
  validateRules,
} from "./clash-import-export";
import type { HistoryActions } from "./clash-history";
import {
  hasInlineComments,
  previewFormat,
} from "./clash-formatter";

export interface ClashEditorToolbarProps {
  content: string;
  onContentChange: (content: string) => void;
  historyActions: HistoryActions;
  className?: string;
}

export function ClashEditorToolbar({
  content,
  onContentChange,
  historyActions,
  className,
}: ClashEditorToolbarProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出选项状态
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [customFilename, setCustomFilename] = useState("");

  // 导入选项状态
  const [importOptions, setImportOptions] = useState<ImportOptions>(
    DEFAULT_IMPORT_OPTIONS,
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 格式化状态
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [formatPreview, setFormatPreview] = useState<
    ReturnType<typeof previewFormat> | null
  >(null);

  // 统计信息状态，避免 SSR 不一致
  const [stats, setStats] = useState(() => getRuleStats(""));
  const [isClient, setIsClient] = useState(false);

  // 在客户端更新统计信息
  useEffect(() => {
    setIsClient(true);
    setStats(getRuleStats(content));
  }, [content]);

  // 如果还在服务端渲染，使用默认统计
  const displayStats = isClient
    ? stats
    : { ruleLines: 0, commentLines: 0, totalLines: 0, emptyLines: 0 };

  // 处理导出
  const handleExport = () => {
    const stats = getRuleStats(content);
    const filename = customFilename.trim() || undefined;

    try {
      exportRules(content, { ...exportOptions, filename });

      toast({
        title: "导出成功",
        description: `已导出 ${stats.ruleLines} 条规则到文件`,
      });

      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  // 处理导入文件选择
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件导入
  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedContent = await importRulesFromFile(file, importOptions);

      // 验证导入的规则
      const validation = validateRules(importedContent);
      if (!validation.isValid) {
        const errorCount = validation.errors.length;
        toast({
          title: "导入警告",
          description: `发现 ${errorCount} 个格式错误，请检查规则格式`,
          variant: "destructive",
        });
      }

      const stats = getRuleStats(importedContent);
      onContentChange(importedContent);

      toast({
        title: "导入成功",
        description: `已从 ${file.name} 导入 ${stats.ruleLines} 条规则`,
      });

      setImportDialogOpen(false);
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "文件读取失败",
        variant: "destructive",
      });
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理撤销
  const handleUndo = () => {
    const previousContent = historyActions.undo();
    if (previousContent !== null) {
      onContentChange(previousContent);
      toast({
        title: "已撤销",
        description: "上一步操作已撤销",
      });
    }
  };

  // 处理重做
  const handleRedo = () => {
    const nextContent = historyActions.redo();
    if (nextContent !== null) {
      onContentChange(nextContent);
      toast({
        title: "已重做",
        description: "已恢复下一步操作",
      });
    }
  };

  // 处理格式化
  const handleFormat = () => {
    if (!hasInlineComments(content)) {
      toast({
        title: "无需格式化",
        description: "当前规则没有行内注释",
      });
      return;
    }

    const preview = previewFormat(content);
    setFormatPreview(preview);
    setFormatDialogOpen(true);
  };

  // 应用格式化
  const applyFormat = () => {
    if (formatPreview) {
      onContentChange(formatPreview.formatted);
      toast({
        title: "格式化完成",
        description:
          `已转换 ${formatPreview.stats.inlineCommentsConverted} 个行内注释`,
      });
      setFormatDialogOpen(false);
      setFormatPreview(null);
    }
  };

  // 处理复制
  const handleCopy = async () => {
    if (!content.trim()) {
      toast({
        title: "无内容可复制",
        description: "编辑器内容为空",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "复制成功",
        description: "编辑器内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div
        className={`flex items-center gap-2 p-2 border-b bg-background/50 ${className}`}
      >
        {/* 撤销重做 */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!historyActions.canUndo}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={!historyActions.canRedo}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* 复制 */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!content.trim()}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制所有内容</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* 格式化 */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFormat}
                disabled={!hasInlineComments(content)}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>格式化规则（转换行内注释）</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* 导入导出 */}
        <div className="flex items-center gap-1">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Upload className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>导入规则</TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>导入规则</DialogTitle>
                <DialogDescription>
                  选择导入选项，然后选择要导入的规则文件
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">导入选项</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="removeQuotes"
                      checked={importOptions.removeQuotes}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          removeQuotes: !!checked,
                        }))}
                    />
                    <Label htmlFor="removeQuotes" className="text-sm">
                      移除引号包裹
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="removePrefix"
                      checked={importOptions.removePrefix}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          removePrefix: !!checked,
                        }))}
                    />
                    <Label htmlFor="removePrefix" className="text-sm">
                      移除前缀 “- ”
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserveComments"
                      checked={importOptions.preserveComments}
                      onCheckedChange={(checked) =>
                        setImportOptions((prev) => ({
                          ...prev,
                          preserveComments: !!checked,
                        }))}
                    />
                    <Label htmlFor="preserveComments" className="text-sm">
                      保留注释
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleImportClick}>
                    选择文件
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>导出规则</TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>导出规则</DialogTitle>
                <DialogDescription>
                  配置导出选项并下载规则文件
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">导出选项</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="removeComments"
                      checked={exportOptions.removeComments}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          removeComments: !!checked,
                        }))}
                    />
                    <Label htmlFor="removeComments" className="text-sm">
                      去除注释
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addQuotes"
                      checked={exportOptions.addQuotes}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          addQuotes: !!checked,
                        }))}
                    />
                    <Label htmlFor="addQuotes" className="text-sm">
                      每行规则都有引号包裹
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addPrefix"
                      checked={exportOptions.addPrefix}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          addPrefix: !!checked,
                        }))}
                    />
                    <Label htmlFor="addPrefix" className="text-sm">
                      每行都加上前缀 “ - ”
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filename" className="text-sm font-medium">
                    自定义文件名（可选）
                  </Label>
                  <Input
                    id="filename"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="clash-rules-2024-01-01.txt"
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  将导出 {displayStats.ruleLines} 条规则
                  {exportOptions.removeComments &&
                    displayStats.commentLines > 0 &&
                    `（忽略 ${displayStats.commentLines} 行注释）`}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setExportDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleExport}>
                    导出
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 格式化对话框 */}
        <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>格式化规则</DialogTitle>
              <DialogDescription>
                将行内注释转换为独立的注释行，提高规则的可读性和兼容性
              </DialogDescription>
            </DialogHeader>

            {formatPreview && (
              <div className="space-y-4">
                <div className="text-sm">
                  <div className="font-medium mb-2">格式化统计：</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>
                      • 原始行数：{formatPreview.stats.originalLineCount}
                    </div>
                    <div>
                      • 格式化后行数：{formatPreview.stats.formattedLineCount}
                    </div>
                    <div>
                      • 转换的行内注释：{formatPreview.stats
                        .inlineCommentsConverted} 个
                    </div>
                    <div>• 新增行数：{formatPreview.stats.linesAdded}</div>
                  </div>
                </div>

                <div className="text-sm">
                  <div className="font-medium mb-2">格式化示例：</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-muted-foreground">格式化前：</div>
                      <code className="block bg-muted p-2 rounded text-xs">
                        DOMAIN-SUFFIX,github.com,DIRECT # GitHub 直连访问
                      </code>
                    </div>
                    <div>
                      <div className="text-muted-foreground">格式化后：</div>
                      <code className="block bg-muted p-2 rounded text-xs">
                        # GitHub 直连访问<br />
                        DOMAIN-SUFFIX,github.com,DIRECT
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFormatDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={applyFormat}>
                    应用格式化
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="h-4 w-px bg-border" />

        {/* 统计信息 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{displayStats.ruleLines} 条规则</span>
          {displayStats.commentLines > 0 && (
            <span>• {displayStats.commentLines} 行注释</span>
          )}
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.yaml,.yml,.conf"
          onChange={handleFileImport}
          style={{ display: "none" }}
        />
      </div>
    </TooltipProvider>
  );
}
