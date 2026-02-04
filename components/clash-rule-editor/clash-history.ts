/**
 * Clash 规则编辑器历史记录管理
 * 提供撤销/重做功能
 */

export interface HistoryEntry {
  content: string;
  timestamp: number;
  description?: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxSize: number;
}

export interface HistoryActions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => string | null;
  redo: () => string | null;
  push: (content: string, description?: string) => void;
  clear: () => void;
  getHistory: () => HistoryEntry[];
  getCurrentEntry: () => HistoryEntry | null;
}

/**
 * 创建历史记录管理器
 * @param initialContent 初始内容
 * @param maxSize 最大历史记录数量
 * @returns 历史记录状态和操作方法
 */
export function createHistoryManager(
  initialContent: string = "",
  maxSize: number = 50,
): [HistoryState, HistoryActions] {
  const initialEntry: HistoryEntry = {
    content: initialContent,
    timestamp: Date.now(),
    description: "Initial content",
  };

  const state: HistoryState = {
    entries: [initialEntry],
    currentIndex: 0,
    maxSize,
  };

  const actions: HistoryActions = {
    get canUndo() {
      return state.currentIndex > 0;
    },

    get canRedo() {
      return state.currentIndex < state.entries.length - 1;
    },

    undo(): string | null {
      if (!actions.canUndo) {
        return null;
      }

      state.currentIndex--;
      return state.entries[state.currentIndex].content;
    },

    redo(): string | null {
      if (!actions.canRedo) {
        return null;
      }

      state.currentIndex++;
      return state.entries[state.currentIndex].content;
    },

    push(content: string, description?: string): void {
      // 检查内容是否与当前内容相同
      const currentEntry = state.entries[state.currentIndex];
      if (currentEntry && currentEntry.content === content) {
        return;
      }

      // 创建新的历史记录条目
      const newEntry: HistoryEntry = {
        content,
        timestamp: Date.now(),
        description: description || "Content change",
      };

      // 如果当前不在历史记录的末尾，删除后续的记录
      if (state.currentIndex < state.entries.length - 1) {
        state.entries = state.entries.slice(0, state.currentIndex + 1);
      }

      // 添加新记录
      state.entries.push(newEntry);
      state.currentIndex = state.entries.length - 1;

      // 限制历史记录大小
      if (state.entries.length > state.maxSize) {
        const removeCount = state.entries.length - state.maxSize;
        state.entries = state.entries.slice(removeCount);
        state.currentIndex -= removeCount;
      }
    },

    clear(): void {
      const currentEntry = state.entries[state.currentIndex];
      state.entries = currentEntry ? [currentEntry] : [];
      state.currentIndex = 0;
    },

    getHistory(): HistoryEntry[] {
      return [...state.entries];
    },

    getCurrentEntry(): HistoryEntry | null {
      return state.entries[state.currentIndex] || null;
    },
  };

  return [state, actions];
}

/**
 * React Hook for history management
 */
import { useCallback, useMemo, useState } from "react";

export function useHistoryManager(
  initialContent: string = "",
  maxSize: number = 50,
) {
  const [historyManager] = useState(() =>
    createHistoryManager(initialContent, maxSize)
  );
  const [, forceUpdate] = useState({});

  // 强制重新渲染的函数
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // 获取当前的 state 和 actions
  const [state, actions] = historyManager;

  const wrappedActions = useMemo<HistoryActions>(
    () => ({
      get canUndo() {
        return actions.canUndo;
      },
      get canRedo() {
        return actions.canRedo;
      },
      undo: () => {
        const result = actions.undo();
        triggerUpdate();
        return result;
      },
      redo: () => {
        const result = actions.redo();
        triggerUpdate();
        return result;
      },
      push: (content: string, description?: string) => {
        actions.push(content, description);
        triggerUpdate();
      },
      clear: () => {
        actions.clear();
        triggerUpdate();
      },
      getHistory: () => actions.getHistory(),
      getCurrentEntry: () => actions.getCurrentEntry(),
    }),
    [actions, triggerUpdate],
  );

  return {
    historyState: state,
    historyActions: wrappedActions,
  };
}

/**
 * 历史记录条目的格式化显示
 */
export function formatHistoryEntry(entry: HistoryEntry): string {
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString();
  const preview = entry.content.slice(0, 50).replace(/\n/g, " ");

  return `${timeStr} - ${entry.description || "Change"}: ${preview}${
    entry.content.length > 50 ? "..." : ""
  }`;
}

/**
 * 计算两个内容之间的差异统计
 */
export function getContentDiff(oldContent: string, newContent: string): {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
} {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let linesAdded = 0;
  let linesRemoved = 0;

  // 计算新增的行
  for (const line of newLines) {
    if (!oldSet.has(line)) {
      linesAdded++;
    }
  }

  // 计算删除的行
  for (const line of oldLines) {
    if (!newSet.has(line)) {
      linesRemoved++;
    }
  }

  // 修改的行数 = 总变化 - 纯新增 - 纯删除
  const linesModified = Math.max(0, Math.min(linesAdded, linesRemoved));

  return {
    linesAdded: linesAdded - linesModified,
    linesRemoved: linesRemoved - linesModified,
    linesModified,
  };
}

/**
 * 自动保存到历史记录的防抖函数
 */
export function createDebouncedHistorySaver(
  pushToHistory: (content: string, description?: string) => void,
  delay: number = 1000,
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastContent = "";

  return (content: string, description?: string) => {
    // 如果内容没有变化，不保存
    if (content === lastContent) {
      return;
    }

    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      pushToHistory(content, description);
      lastContent = content;
      timeoutId = null;
    }, delay);
  };
}
