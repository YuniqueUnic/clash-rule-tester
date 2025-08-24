"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, StateEffect } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { lintGutter } from "@codemirror/lint";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// 导入模块化的功能
import { useClashEditorData } from "@/hooks/use-clash-editor-data";
import { createClashLanguageExtension } from "./clash-language-support";
import { createClashCompletionProvider } from "./clash-completion-provider";
import { createClashLinter } from "./clash-linter";
import { createClashTheme } from "./clash-theme";

export interface ClashRuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  highlightedLine?: number;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * 重构后的 Clash 规则编辑器
 * 使用模块化架构和真实数据
 */
export function ClashRuleEditor({
  value,
  onChange,
  highlightedLine,
  className,
  placeholder = "# 在此输入 Clash 规则\n# 例如：DOMAIN-SUFFIX,google.com,PROXY",
  readOnly = false,
  minHeight = 200,
  maxHeight = 600,
}: ClashRuleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // 获取真实数据
  const editorData = useClashEditorData();

  // 更新行数
  useEffect(() => {
    const lines = value.split("\n").length;
    setLineCount(lines);
  }, [value]);

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    const extensions = [
      basicSetup,
      // 语法高亮和语言支持
      createClashLanguageExtension(editorData.policies, isDark),
      // 代码补全
      createClashCompletionProvider(editorData),
      // 语法检查
      createClashLinter(editorData),
      lintGutter(),
      // 主题
      createClashTheme(isDark, lineCount),
      // 键盘映射
      keymap.of([indentWithTab, ...defaultKeymap]),
      // 只读模式
      EditorView.editable.of(!readOnly),
      // 内容变化监听
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),
      // 高度限制
      EditorView.theme({
        ".cm-content": {
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        },
        ".cm-scroller": {
          maxHeight: `${maxHeight}px`,
        },
      }),
    ];

    const state = EditorState.create({
      doc: value || placeholder,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, []); // 只在组件挂载时初始化

  // 更新编辑器内容
  useEffect(() => {
    if (
      editorViewRef.current &&
      value !== editorViewRef.current.state.doc.toString()
    ) {
      const transaction = editorViewRef.current.state.update({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: value,
        },
      });
      editorViewRef.current.dispatch(transaction);
    }
  }, [value]);

  // 更新主题
  useEffect(() => {
    if (editorViewRef.current) {
      const newExtensions = [
        basicSetup,
        createClashLanguageExtension(editorData.policies, isDark),
        createClashCompletionProvider(editorData),
        createClashLinter(editorData),
        lintGutter(),
        createClashTheme(isDark, lineCount),
        keymap.of([indentWithTab, ...defaultKeymap]),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),
        EditorView.theme({
          ".cm-content": {
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
          },
          ".cm-scroller": {
            maxHeight: `${maxHeight}px`,
          },
        }),
      ];

      const transaction = editorViewRef.current.state.update({
        effects: StateEffect.reconfigure.of(newExtensions),
      });
      editorViewRef.current.dispatch(transaction);
    }
  }, [isDark, editorData, lineCount, readOnly, minHeight, maxHeight, onChange]);

  // 高亮指定行
  useEffect(() => {
    if (editorViewRef.current && highlightedLine && highlightedLine > 0) {
      try {
        const line = editorViewRef.current.state.doc.line(highlightedLine);
        if (line) {
          // 滚动到指定行
          editorViewRef.current.dispatch({
            effects: EditorView.scrollIntoView(line.from, { y: "center" }),
          });
        }
      } catch (error) {
        console.warn("Failed to highlight line:", error);
      }
    }
  }, [highlightedLine]);

  return (
    <div className={cn("clash-rule-editor", className)}>
      <div ref={editorRef} className="w-full" />
    </div>
  );
}

// 导出类型
export type { ClashEditorData } from "./clash-completion-provider";
