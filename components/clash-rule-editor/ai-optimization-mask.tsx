"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIOptimizationMaskProps {
  /** 是否显示遮罩 */
  visible: boolean;
  /** 停止 AI 优化的回调函数 */
  onStop: () => void;
  /** 遮罩的类名 */
  className?: string;
}

/**
 * AI 优化规则时的遮罩组件
 * 阻止用户编辑，并提供停止优化的选项
 */
export function AIOptimizationMask({
  visible,
  onStop,
  className,
}: AIOptimizationMaskProps) {
  const [showStopDialog, setShowStopDialog] = useState(false);

  // 处理停止按钮点击
  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  // 确认停止 AI 优化
  const confirmStop = () => {
    setShowStopDialog(false);
    onStop();
  };

  // 取消停止
  const cancelStop = () => {
    setShowStopDialog(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={cn(
          "absolute inset-0 z-50 bg-background/80 backdrop-blur-sm",
          "flex items-center justify-center",
          "transition-all duration-300 ease-in-out",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-4 p-6 bg-card border rounded-lg shadow-lg">
          {/* 加载动画 */}
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-lg font-medium">AI 正在优化规则</div>
          </div>

          {/* 描述文字 */}
          <div className="text-sm text-muted-foreground text-center max-w-sm">
            AI 正在分析和优化您的 Clash 规则，请稍候...
            <br />
            优化过程中编辑器将被锁定以避免冲突
          </div>

          {/* 停止按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopClick}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            停止优化
          </Button>
        </div>
      </div>

      {/* 停止确认对话框 */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认停止 AI 优化
            </DialogTitle>
            <DialogDescription>
              您确定要停止当前的 AI 规则优化吗？
              <br />
              停止后，已经进行的优化将会丢失，编辑器将恢复可编辑状态。
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={cancelStop}>
              继续优化
            </Button>
            <Button variant="destructive" onClick={confirmStop}>
              确认停止
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * AI 优化遮罩的 Hook
 * 提供遮罩状态管理
 */
export function useAIOptimizationMask() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const startOptimization = () => {
    setIsOptimizing(true);
  };

  const stopOptimization = () => {
    setIsOptimizing(false);
  };

  return {
    isOptimizing,
    startOptimization,
    stopOptimization,
  };
}
