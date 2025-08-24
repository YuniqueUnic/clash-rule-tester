import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

/**
 * 行高亮效果的参数接口
 */
export interface LineHighlightParams {
  lineNumber: number;
  isDark: boolean;
}

/**
 * 行高亮效果定义
 * 用于触发行高亮的状态变化
 */
export const lineHighlightEffect = StateEffect.define<LineHighlightParams>();

/**
 * 行高亮状态字段
 * 管理编辑器中的行高亮装饰
 */
export const lineHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  
  update(decorations, tr) {
    // 映射现有装饰到新的文档状态
    decorations = decorations.map(tr.changes);

    // 检查是否有行高亮效果
    for (const effect of tr.effects) {
      if (effect.is(lineHighlightEffect)) {
        const { lineNumber, isDark } = effect.value;
        const builder = new RangeSetBuilder<Decoration>();

        // 验证行号有效性
        if (lineNumber && lineNumber > 0 && lineNumber <= tr.state.doc.lines) {
          try {
            const line = tr.state.doc.line(lineNumber);
            if (line) {
              // 创建行装饰
              const decoration = Decoration.line({
                attributes: {
                  style: createHighlightStyle(isDark),
                  class: "clash-highlighted-line",
                },
              });
              builder.add(line.from, line.from, decoration);
            }
          } catch (error) {
            console.warn("Line highlight error:", error);
          }
        }

        return builder.finish();
      }
    }

    return decorations;
  },
  
  // 提供装饰给编辑器
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * 创建高亮样式
 * @param isDark 是否为暗色主题
 * @returns CSS样式字符串
 */
function createHighlightStyle(isDark: boolean): string {
  const backgroundColor = isDark 
    ? "rgba(59, 130, 246, 0.2)" 
    : "rgba(59, 130, 246, 0.15)";
  const borderColor = isDark 
    ? "#3b82f6" 
    : "#2563eb";
  
  return [
    `background-color: ${backgroundColor}`,
    `border-left: 3px solid ${borderColor}`,
    "transition: all 0.2s ease-in-out",
    "animation: clash-highlight-pulse 0.5s ease-in-out",
  ].join("; ");
}

/**
 * 创建行高亮扩展
 * @returns CodeMirror扩展数组
 */
export function createLineHighlightExtension() {
  return [
    lineHighlightField,
    // 添加CSS动画样式
    EditorView.theme({
      ".clash-highlighted-line": {
        position: "relative",
      },
      "@keyframes clash-highlight-pulse": {
        "0%": {
          backgroundColor: "transparent",
          borderLeftColor: "transparent",
        },
        "50%": {
          backgroundColor: "rgba(59, 130, 246, 0.3)",
          borderLeftColor: "#3b82f6",
        },
        "100%": {
          // 最终状态由内联样式控制
        },
      },
    }),
  ];
}

/**
 * 高亮指定行
 * @param view 编辑器视图
 * @param lineNumber 行号（1-based）
 * @param isDark 是否为暗色主题
 */
export function highlightLine(
  view: EditorView, 
  lineNumber: number, 
  isDark: boolean = false
) {
  if (!view || lineNumber <= 0) {
    return;
  }

  try {
    // 发送高亮效果
    view.dispatch({
      effects: lineHighlightEffect.of({
        lineNumber,
        isDark,
      }),
    });

    // 滚动到指定行（居中显示）
    const line = view.state.doc.line(lineNumber);
    if (line) {
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
    }
  } catch (error) {
    console.warn("Failed to highlight line:", error);
  }
}

/**
 * 清除所有行高亮
 * @param view 编辑器视图
 */
export function clearLineHighlight(view: EditorView) {
  if (!view) {
    return;
  }

  try {
    // 发送清除效果（行号为0表示清除）
    view.dispatch({
      effects: lineHighlightEffect.of({
        lineNumber: 0,
        isDark: false,
      }),
    });
  } catch (error) {
    console.warn("Failed to clear line highlight:", error);
  }
}

/**
 * 获取当前高亮的行号
 * @param view 编辑器视图
 * @returns 高亮的行号，如果没有高亮则返回null
 */
export function getCurrentHighlightedLine(view: EditorView): number | null {
  if (!view) {
    return null;
  }

  try {
    const decorations = view.state.field(lineHighlightField);
    const cursor = decorations.iter();
    
    if (cursor.value) {
      // 找到第一个装饰的位置，转换为行号
      const pos = cursor.from;
      const line = view.state.doc.lineAt(pos);
      return line.number;
    }
  } catch (error) {
    console.warn("Failed to get highlighted line:", error);
  }

  return null;
}
