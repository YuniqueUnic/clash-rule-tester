"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: "horizontal" | "vertical";
  defaultSizes?: [number, number]; // 百分比，总和应为100
  minSizes?: [number, number]; // 最小尺寸百分比
  className?: string;
  onResize?: (sizes: [number, number]) => void;
  storageKey?: string; // localStorage键名，用于保存布局
}

export function ResizablePanels({
  children,
  direction = "vertical",
  defaultSizes = [60, 40],
  minSizes = [20, 20],
  className,
  onResize,
  storageKey,
}: ResizablePanelsProps) {
  const [sizes, setSizes] = useState<[number, number]>(defaultSizes);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);

  // 从localStorage恢复布局
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsedSizes = JSON.parse(saved) as [number, number];
          if (
            Array.isArray(parsedSizes) &&
            parsedSizes.length === 2 &&
            parsedSizes[0] >= minSizes[0] &&
            parsedSizes[1] >= minSizes[1] &&
            Math.abs(parsedSizes[0] + parsedSizes[1] - 100) < 0.1
          ) {
            setSizes(parsedSizes);
          }
        } catch (error) {
          console.warn("Failed to parse saved panel sizes:", error);
        }
      }
    }
  }, [storageKey, minSizes]);

  // 保存布局到localStorage
  const saveSizes = useCallback(
    (newSizes: [number, number]) => {
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(newSizes));
      }
    },
    [storageKey]
  );

  // 处理鼠标按下事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction]);

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      let percentage: number;
      if (direction === "horizontal") {
        percentage = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        percentage = ((e.clientY - rect.top) / rect.height) * 100;
      }

      // 限制在最小尺寸范围内
      percentage = Math.max(minSizes[0], Math.min(100 - minSizes[1], percentage));

      const newSizes: [number, number] = [percentage, 100 - percentage];
      setSizes(newSizes);
      onResize?.(newSizes);
    },
    [isDragging, direction, minSizes, onResize]
  );

  // 处理鼠标释放事件
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      saveSizes(sizes);
    }
  }, [isDragging, sizes, saveSizes]);

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 双击重置为默认大小
  const handleDoubleClick = useCallback(() => {
    setSizes(defaultSizes);
    onResize?.(defaultSizes);
    saveSizes(defaultSizes);
  }, [defaultSizes, onResize, saveSizes]);

  const isHorizontal = direction === "horizontal";
  const splitterSize = 4; // 分割器厚度（像素）

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full h-full",
        isHorizontal ? "flex-row" : "flex-col",
        className
      )}
    >
      {/* 第一个面板 */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? "width" : "height"]: `${sizes[0]}%`,
        }}
      >
        {children[0]}
      </div>

      {/* 分割器 */}
      <div
        ref={splitterRef}
        className={cn(
          "bg-border hover:bg-accent transition-colors duration-200 flex-shrink-0 relative group",
          isHorizontal ? "cursor-col-resize w-1" : "cursor-row-resize h-1",
          isDragging && "bg-accent"
        )}
        style={{
          [isHorizontal ? "width" : "height"]: `${splitterSize}px`,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* 分割器指示器 */}
        <div
          className={cn(
            "absolute bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isHorizontal
              ? "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8"
              : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-1",
            isDragging && "opacity-100"
          )}
        />
        
        {/* 拖拽热区 */}
        <div
          className={cn(
            "absolute",
            isHorizontal
              ? "top-0 left-1/2 transform -translate-x-1/2 w-2 h-full"
              : "left-0 top-1/2 transform -translate-y-1/2 w-full h-2"
          )}
        />
      </div>

      {/* 第二个面板 */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? "width" : "height"]: `${sizes[1]}%`,
        }}
      >
        {children[1]}
      </div>
    </div>
  );
}

// 面板容器组件，提供滚动功能
interface PanelProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function Panel({ children, className, scrollable = true }: PanelProps) {
  return (
    <div
      className={cn(
        "w-full h-full",
        scrollable ? "overflow-auto" : "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

// Hook for managing panel sizes
export function usePanelSizes(
  defaultSizes: [number, number] = [60, 40],
  storageKey?: string
) {
  const [sizes, setSizes] = useState<[number, number]>(defaultSizes);

  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsedSizes = JSON.parse(saved) as [number, number];
          if (Array.isArray(parsedSizes) && parsedSizes.length === 2) {
            setSizes(parsedSizes);
          }
        } catch (error) {
          console.warn("Failed to parse saved panel sizes:", error);
        }
      }
    }
  }, [storageKey]);

  const updateSizes = useCallback(
    (newSizes: [number, number]) => {
      setSizes(newSizes);
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(newSizes));
      }
    },
    [storageKey]
  );

  return [sizes, updateSizes] as const;
}
