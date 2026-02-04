import { Diagnostic, linter } from "@codemirror/lint";
import type { ClashEditorData } from "./clash-completion-provider";
import { validateRuleText } from "@/lib/clash-rule-validate";

/**
 * 创建 Clash 规则语法检查器（统一复用 lib/clash-rule-validate.ts）
 * @param editorData 编辑器数据
 */
export function createClashLinter(editorData: ClashEditorData) {
  return linter((view) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;

    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const rawText = line.text;
      const trimmedText = rawText.trim();

      if (!trimmedText || trimmedText.startsWith("#")) continue;

      const trimOffset = rawText.indexOf(trimmedText);
      const issues = validateRuleText(trimmedText, i, {
        policies: editorData.policies,
        geoIPCountries: editorData.geoIPCountries,
        geoSiteCategories: editorData.geoSiteCategories,
        networkTypes: editorData.networkTypes,
        asnList: editorData.asnList,
      });

      diagnostics.push(
        ...issues.map((issue) => ({
          from: line.from + trimOffset + (issue.column?.start ?? 0),
          to: line.from + trimOffset + (issue.column?.end ?? trimmedText.length),
          severity: issue.severity,
          message: issue.message,
        })),
      );
    }

    return diagnostics;
  });
}
