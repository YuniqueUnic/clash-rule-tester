export interface TestRequest {
  domain?: string;
  process?: string;
  processPath?: string;
  network?: string;
  uid?: string;
  inType?: string;
  // 测试字段
  srcIPv4?: string;
  srcIPv6?: string;
  srcPort?: string;
  dstIPv4?: string;
  dstIPv6?: string;
  dstPort?: string;
  geoIP?: string;
}

export interface MatchResult {
  matched: boolean;
  rule: string;
  lineNumber: number;
  ruleType: string;
  policy: string;
  explanation: string;
  detailedExplanation: string;
  matchedContent: string;
  matchRange?: string;
  matchPosition?: string;
}

export interface EngineRule {
  original: string;
  lineNumber: number;
  ruleType: string;
  content: string;
  policy: string;
  isLogical: boolean;
}

export interface MatchContext {
  geoIPDatabase?: Record<string, string>;
  geoSiteData?: Record<string, string[]>;
  asnData?: Record<string, string>;
  ruleSetData?: Record<string, (request: TestRequest) => boolean>;
}

