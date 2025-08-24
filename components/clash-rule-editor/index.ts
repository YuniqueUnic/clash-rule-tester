// 重构后的 Clash 规则编辑器模块
// 采用模块化架构，使用真实数据，遵循 KISS 原则

// 主要组件
export { ClashRuleEditor } from "./clash-rule-editor-v2";
export type {
  ClashEditorData,
  ClashRuleEditorProps,
} from "./clash-rule-editor-v2";

// 语法高亮和语言支持
export {
  CLASH_RULE_TYPES,
  createClashHighlightStyle,
  createClashLanguageExtension,
  createClashLanguageSupport,
} from "./clash-language-support";

// 代码补全
export { createClashCompletionProvider } from "./clash-completion-provider";

// 语法检查
export { createClashLinter } from "./clash-linter";

// 主题
export { createClashTheme, createLineHighlightExtension } from "./clash-theme";

// 数据 Hook
export {
  useClashEditorData,
  useGeoIPDetails,
  useGeoSiteDetails,
  useNetworkTypeDetails,
  usePolicyDetails,
} from "../../hooks/use-clash-editor-data";
