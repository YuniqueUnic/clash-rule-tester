import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";

/**
 * 创建 Clash 规则编辑器主题
 * @param isDark 是否为暗色主题
 * @param lineCount 行数，用于计算行号宽度
 */
export function createClashTheme(
  isDark: boolean = false,
  lineCount: number = 1,
): Extension {
  const lineNumberWidth = Math.max(2, String(lineCount).length);

  const baseTheme = EditorView.theme({
    "&": {
      fontSize: "14px",
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
    },
    ".cm-content": {
      padding: "12px 0",
      minHeight: "200px",
      lineHeight: "1.6",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-editor": {
      borderRadius: "8px",
      border: isDark ? "1px solid #374151" : "1px solid #d1d5db",
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
    },
    ".cm-gutters": {
      backgroundColor: isDark ? "#111827" : "#f9fafb",
      borderRight: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
      color: isDark ? "#6b7280" : "#9ca3af",
      minWidth: `${lineNumberWidth * 0.8 + 1}em`,
    },
    ".cm-lineNumbers": {
      minWidth: `${lineNumberWidth * 0.8}em`,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 4px",
      fontSize: "13px",
    },
    ".cm-activeLine": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.1)"
        : "rgba(59, 130, 246, 0.05)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.15)"
        : "rgba(59, 130, 246, 0.1)",
      color: isDark ? "#60a5fa" : "#3b82f6",
      fontWeight: "600",
    },
    ".cm-selectionBackground": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(59, 130, 246, 0.2)",
    },
    ".cm-focused .cm-selectionBackground": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(59, 130, 246, 0.2)",
    },
    ".cm-cursor": {
      borderLeftColor: isDark ? "#60a5fa" : "#3b82f6",
      borderLeftWidth: "2px",
    },
    ".cm-searchMatch": {
      backgroundColor: isDark
        ? "rgba(251, 191, 36, 0.3)"
        : "rgba(251, 191, 36, 0.2)",
      border: isDark
        ? "1px solid rgba(251, 191, 36, 0.5)"
        : "1px solid rgba(251, 191, 36, 0.4)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: isDark
        ? "rgba(251, 191, 36, 0.5)"
        : "rgba(251, 191, 36, 0.3)",
    },
    // 折叠相关样式
    ".cm-foldPlaceholder": {
      backgroundColor: isDark ? "#374151" : "#e5e7eb",
      border: isDark ? "1px solid #4b5563" : "1px solid #d1d5db",
      color: isDark ? "#9ca3af" : "#6b7280",
      borderRadius: "4px",
      padding: "0 4px",
      margin: "0 2px",
    },
    // 补全弹窗样式
    ".cm-tooltip": {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      border: isDark ? "1px solid #374151" : "1px solid #d1d5db",
      borderRadius: "8px",
      boxShadow: isDark
        ? "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)"
        : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete": {
      "& > ul": {
        maxHeight: "200px",
        fontFamily: "inherit",
        fontSize: "13px",
      },
      "& > ul > li": {
        padding: "6px 12px",
        borderRadius: "4px",
        margin: "2px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: isDark ? "#3b82f6" : "#3b82f6",
        color: "#ffffff",
      },
    },
    ".cm-completionLabel": {
      fontWeight: "500",
    },
    ".cm-completionDetail": {
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: "12px",
      marginLeft: "8px",
    },
    // 错误提示样式
    ".cm-diagnostic": {
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "13px",
      fontFamily: "inherit",
    },
    ".cm-diagnostic.cm-diagnostic-error": {
      backgroundColor: isDark
        ? "rgba(239, 68, 68, 0.1)"
        : "rgba(239, 68, 68, 0.05)",
      borderLeft: "3px solid #ef4444",
      color: isDark ? "#fca5a5" : "#dc2626",
    },
    ".cm-diagnostic.cm-diagnostic-warning": {
      backgroundColor: isDark
        ? "rgba(251, 191, 36, 0.1)"
        : "rgba(251, 191, 36, 0.05)",
      borderLeft: "3px solid #f59e0b",
      color: isDark ? "#fcd34d" : "#d97706",
    },
    ".cm-diagnostic.cm-diagnostic-info": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.1)"
        : "rgba(59, 130, 246, 0.05)",
      borderLeft: "3px solid #3b82f6",
      color: isDark ? "#93c5fd" : "#2563eb",
    },
    // 行内错误标记
    ".cm-lintRange": {
      backgroundImage: "none",
    },
    ".cm-lintRange.cm-lintRange-error": {
      textDecoration: "underline",
      textDecorationColor: "#ef4444",
      textDecorationStyle: "wavy",
      textUnderlineOffset: "3px",
    },
    ".cm-lintRange.cm-lintRange-warning": {
      textDecoration: "underline",
      textDecorationColor: "#f59e0b",
      textDecorationStyle: "wavy",
      textUnderlineOffset: "3px",
    },
    // 行高亮样式
    ".cm-line-highlight": {
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.2)"
        : "rgba(59, 130, 246, 0.1)",
      borderRadius: "4px",
      margin: "0 -4px",
      padding: "0 4px",
    },
    // 滚动条样式
    ".cm-scroller::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      backgroundColor: isDark ? "#1f2937" : "#f9fafb",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      backgroundColor: isDark ? "#4b5563" : "#d1d5db",
      borderRadius: "4px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      backgroundColor: isDark ? "#6b7280" : "#9ca3af",
    },
    // 搜索框样式
    ".cm-panel": {
      backgroundColor: isDark ? "#111827" : "#f9fafb",
      border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
    },
    ".cm-panel input": {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      border: isDark ? "1px solid #374151" : "1px solid #d1d5db",
      color: isDark ? "#f9fafb" : "#111827",
      borderRadius: "4px",
      padding: "4px 8px",
    },
    ".cm-panel button": {
      backgroundColor: isDark ? "#374151" : "#e5e7eb",
      border: "none",
      color: isDark ? "#f9fafb" : "#111827",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
    },
    ".cm-panel button:hover": {
      backgroundColor: isDark ? "#4b5563" : "#d1d5db",
    },
  }, { dark: isDark });

  return baseTheme;
}
