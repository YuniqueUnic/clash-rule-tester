export type ParsedRuleKind = "empty" | "comment" | "rule";

export interface ParsedRule {
  kind: ParsedRuleKind;
  lineNumber: number;
  /** 原始行（不做 trim） */
  original: string;
  /** trim 后的行内容 */
  trimmed: string;
  /** 仅对 kind=rule 生效：按“顶层逗号”切分的字段 */
  parts: string[];
  /** 仅对 kind=rule 生效 */
  ruleType?: string;
  /** 仅对 kind=rule 生效 */
  content?: string;
  /** 仅对 kind=rule 生效 */
  policy?: string;
  /** 仅对 kind=rule 生效：额外字段（可选参数等） */
  extra?: string[];
  /** 仅对 kind=rule 生效：AND/OR/NOT */
  isLogical?: boolean;
}

/**
 * 将一行规则按“顶层逗号”切分（不切分括号内的逗号）。
 * 例如：AND,(DOMAIN,google.com),(DST-PORT,443),PROXY
 * => ["AND","(DOMAIN,google.com)","(DST-PORT,443)","PROXY"]
 */
export function splitByCommaOutsideParens(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      parts.push(line.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(line.slice(start).trim());
  return parts;
}

export function parseRuleLine(line: string, lineNumber: number): ParsedRule {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      kind: "empty",
      lineNumber,
      original: line,
      trimmed,
      parts: [],
    };
  }

  if (trimmed.startsWith("#")) {
    return {
      kind: "comment",
      lineNumber,
      original: line,
      trimmed,
      parts: [],
    };
  }

  const parts = splitByCommaOutsideParens(trimmed);
  const ruleType = parts[0] ?? "";
  const isLogical = ["AND", "OR", "NOT"].includes(ruleType);

  // MATCH: MATCH,<POLICY>[,options...]
  if (ruleType === "MATCH") {
    return {
      kind: "rule",
      lineNumber,
      original: line,
      trimmed,
      parts,
      ruleType,
      content: "",
      policy: parts[1],
      extra: parts.slice(2),
      isLogical: false,
    };
  }

  // AND/OR/NOT: AND,(cond1),(cond2),<POLICY>[,options...]
  if (isLogical) {
    const policy = parts.length >= 2 ? parts[parts.length - 1] : undefined;
    const content =
      parts.length >= 3 ? parts.slice(1, -1).join(",") : parts[1] ?? "";
    return {
      kind: "rule",
      lineNumber,
      original: line,
      trimmed,
      parts,
      ruleType,
      content,
      policy,
      extra: [],
      isLogical: true,
    };
  }

  // 默认规则：TYPE,<VALUE>,<POLICY>[,options...]
  return {
    kind: "rule",
    lineNumber,
    original: line,
    trimmed,
    parts,
    ruleType,
    content: parts[1],
    policy: parts[2],
    extra: parts.slice(3),
    isLogical: false,
  };
}

export function parseRulesText(rulesText: string): ParsedRule[] {
  const lines = rulesText.split("\n");
  return lines.map((line, index) => parseRuleLine(line, index + 1));
}

