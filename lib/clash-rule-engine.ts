import { parseRulesText } from "@/lib/clash-rule-parse";
import { matchRequest } from "@/lib/clash-rule-match";
import type {
  EngineRule,
  MatchContext,
  MatchResult,
  TestRequest,
} from "@/lib/clash-rule-types";
import { validateRulesText } from "@/lib/clash-rule-validate";

export type { MatchResult, TestRequest } from "@/lib/clash-rule-types";

/**
 * 薄封装：负责保存状态、组装上下文并调用纯函数 parse/validate/match。
 *
 * - 解析：`parseRulesText`
 * - 校验：`validateRulesText`
 * - 匹配：`matchRequest`
 */
export class ClashRuleEngine {
  private rulesText = "";
  private rules: EngineRule[] = [];

  private _geoIPDatabase: Record<string, string> = {};
  private _geoSiteData: Record<string, string[]> = {};
  private _asnData: Record<string, string> = {};
  private _ruleSetData: Record<string, (request: TestRequest) => boolean> = {};

  constructor(rulesText: string) {
    this.parseRules(rulesText);
  }

  public updateRules(rulesText: string): void {
    this.parseRules(rulesText);
  }

  private parseRules(rulesText: string): void {
    this.rulesText = rulesText;
    this.rules = [];

    for (const parsed of parseRulesText(rulesText)) {
      if (parsed.kind !== "rule" || !parsed.ruleType) continue;

      const ruleType = parsed.ruleType;
      const policy = parsed.policy?.trim() || "DIRECT";
      const content = parsed.content?.trim() || "";

      // 对于匹配执行，缺少 content 的规则没有意义；但校验会通过 rulesText 给出错误
      if (!content && ruleType !== "MATCH") continue;

      this.rules.push({
        original: parsed.original,
        lineNumber: parsed.lineNumber,
        ruleType,
        content,
        policy,
        isLogical: !!parsed.isLogical,
      });
    }
  }

  public testRequest(request: TestRequest): MatchResult | null {
    const context: MatchContext = {
      geoIPDatabase: this._geoIPDatabase,
      geoSiteData: this._geoSiteData,
      asnData: this._asnData,
      ruleSetData: this._ruleSetData,
    };

    return matchRequest(this.rules, request, context);
  }

  public setGeoIPDatabase(data: Record<string, string>): void {
    this._geoIPDatabase = data;
  }

  public setGeoSiteData(data: Record<string, string[]>): void {
    this._geoSiteData = data;
  }

  public setASNData(data: Record<string, string>): void {
    this._asnData = data;
  }

  public setRuleSetData(
    data: Record<string, (request: TestRequest) => boolean>,
  ): void {
    this._ruleSetData = data;
  }

  public getRuleCount(): number {
    return this.rules.length;
  }

  public validateRules(): ValidationResult[] {
    return validateRulesText(this.rulesText).map((issue) => ({
      lineNumber: issue.lineNumber,
      rule: issue.rule,
      error: issue.message,
      severity: issue.severity,
    }));
  }
}

interface ValidationResult {
  lineNumber: number;
  rule: string;
  error: string;
  severity: "error" | "warning";
}
