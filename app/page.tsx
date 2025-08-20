"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  HelpCircle,
  Monitor,
  Moon,
  Settings,
  Sun,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsDialog } from "@/components/settings-dialog";
import { HelpDialog } from "@/components/help-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import {
  ClashRuleEngine,
  type MatchResult,
  type TestRequest,
} from "@/lib/clash-rule-engine";
import {
  DEFAULT_ENABLED_TEST_ITEMS,
  DEFAULT_TEST_METRICS,
  type EnabledTestItems,
  GEOIP_COUNTRIES,
  type GeoIPCountryData,
  NETWORK_TYPES,
  type NetworkTypeData,
  POLICIES,
  type PolicyData,
  SAMPLE_RULES,
  type TestMetrics as TestMetricsType,
} from "@/lib/clash-data-sources";

// 导入新的组件
import { QuickRuleCreator } from "@/components/left-column/quick-rule-creator";
import { PolicyManager } from "@/components/left-column/policy-manager";
import { RuleEditor } from "@/components/center-column/rule-editor";
import { TestResult } from "@/components/center-column/test-result";
import { RuleTester } from "@/components/right-column/rule-tester";
import { TestHistory } from "@/components/right-column/test-history";
import { TestMetrics } from "@/components/right-column/test-metrics";

interface Policy {
  id: string;
  name: string;
  comment?: string;
  createdAt?: number;
}

interface TestHistory {
  id: string;
  timestamp: number;
  request: TestRequest;
  result: MatchResult | null;
  duration: number;
}

interface AISettings {
  provider: "openai" | "gemini" | "openai-compatible" | "";
  apiKey: string;
  model: string;
}

export default function ClashRuleTester() {
  // 主题管理
  const { theme, setTheme, isDark } = useTheme();
  const { toast } = useToast();

  // 核心状态
  const [rules, setRules] = useState(SAMPLE_RULES);
  const [ruleEngine] = useState(() => new ClashRuleEngine(SAMPLE_RULES));
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchResultExpanded, setMatchResultExpanded] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>();
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);

  // 策略管理
  const [policies, setPolicies] = useState<Policy[]>(() =>
    POLICIES.map((policy, index) => {
      const now = Date.now();
      return {
        id: `policy-${index}`, // 使用稳定的 ID
        name: policy.name,
        comment: policy.description,
        createdAt: now + index, // 添加创建时间
      };
    })
  );

  // 测试数据状态
  const [testDomain, setTestDomain] = useState("www.google.com");
  const [testSrcIPv4, setTestSrcIPv4] = useState("192.168.1.100");
  const [testSrcIPv6, setTestSrcIPv6] = useState("2001:db8::1");
  const [testSrcPort, setTestSrcPort] = useState("12345");
  const [testDstIPv4, setTestDstIPv4] = useState("8.8.8.8");
  const [testDstIPv6, setTestDstIPv6] = useState("2001:4860:4860::8888");
  const [testDstPort, setTestDstPort] = useState("443");
  const [testProcess, setTestProcess] = useState("chrome.exe");
  const [testProcessPath, setTestProcessPath] = useState("/usr/bin/chrome");
  const [testGeoIP, setTestGeoIP] = useState("US");
  const [testNetwork, setTestNetwork] = useState("tcp");
  const [testUID, setTestUID] = useState("1000");

  // 启用的测试项目
  const [enabledTestItems, setEnabledTestItems] = useState<EnabledTestItems>(
    DEFAULT_ENABLED_TEST_ITEMS,
  );

  // IP 类型选择
  const [srcIPType, setSrcIPType] = useState<"ipv4" | "ipv6" | "both">("ipv4");
  const [dstIPType, setDstIPType] = useState<"ipv4" | "ipv6" | "both">("ipv4");

  // 自动测试
  const [autoTest, setAutoTest] = useState(false);
  const [autoTestDelayMs, setAutoTestDelayMs] = useState(500);
  const [autoTestDelay, setAutoTestDelay] = useState<NodeJS.Timeout | null>(
    null,
  );

  // 测试历史和指标
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [testMetrics, setTestMetrics] = useState<TestMetricsType>(
    DEFAULT_TEST_METRICS,
  );

  // 数据源管理
  const [geoIPCountries, setGeoIPCountries] = useState<string[]>(
    GEOIP_COUNTRIES.filter((c) => c.popular).map((c) => c.code),
  );
  const [networkTypes, setNetworkTypes] = useState<string[]>(
    NETWORK_TYPES.filter((n) => n.category === "transport").map((n) => n.type),
  );
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newNetworkType, setNewNetworkType] = useState("");

  // AI 相关状态
  const [ruleExplanation, setRuleExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings>({
    provider: "",
    apiKey: "",
    model: "",
  });

  // 对话框状态
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // 统计信息
  const ruleCount = ruleEngine.getRuleCount();

  const hasError = false; // 这里可以添加错误检测逻辑
  const errorCount = 0;

  // 更新规则引擎
  useEffect(() => {
    try {
      ruleEngine.updateRules(rules);
    } catch (error) {
      console.error("Failed to update rules:", error);
    }
  }, [rules, ruleEngine]);

  // 测试规则函数
  const testRules = useCallback(() => {
    if (isTestingInProgress) return;

    setIsTestingInProgress(true);
    const startTime = performance.now();

    try {
      const testRequest: TestRequest = {
        domain: enabledTestItems.domain ? testDomain : undefined,
        process: enabledTestItems.process ? testProcess : undefined,
        processPath: enabledTestItems.processPath ? testProcessPath : undefined,
        network: enabledTestItems.network ? testNetwork : undefined,
        uid: enabledTestItems.uid ? testUID : undefined,
        srcIPv4: enabledTestItems.srcIP ? testSrcIPv4 : undefined,
        srcIPv6: enabledTestItems.srcIP ? testSrcIPv6 : undefined,
        srcPort: enabledTestItems.srcPort ? testSrcPort : undefined,
        dstIPv4: enabledTestItems.dstIP ? testDstIPv4 : undefined,
        dstIPv6: enabledTestItems.dstIP ? testDstIPv6 : undefined,
        dstPort: enabledTestItems.dstPort ? testDstPort : undefined,
        geoIP: enabledTestItems.geoIP ? testGeoIP : undefined,
      };

      const result = ruleEngine.testRequest(testRequest);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setMatchResult(result);
      setHighlightedLine(result?.lineNumber);

      // 添加到测试历史
      const historyEntry: TestHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        request: testRequest,
        result,
        duration,
      };

      setTestHistory((prev) => [historyEntry, ...prev.slice(0, 49)]); // 保留最近 50 条

      // 更新测试指标
      setTestMetrics((prev: TestMetricsType) => {
        const newTotalTests = prev.totalTests + 1;
        const newAverageTime = (prev.averageTime * prev.totalTests + duration) /
          newTotalTests;
        const newSuccessRate = result
          ? (prev.successRate * prev.totalTests + 100) / newTotalTests
          : (prev.successRate * prev.totalTests) / newTotalTests;

        return {
          totalTests: newTotalTests,
          averageTime: newAverageTime,
          successRate: newSuccessRate,
          lastTestTime: duration,
        };
      });
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "测试失败",
        description: "规则测试过程中发生错误。",
        variant: "destructive",
      });
    } finally {
      setIsTestingInProgress(false);
    }
  }, [
    testDomain,
    testProcess,
    testProcessPath,
    testSrcIPv4,
    testSrcIPv6,
    testSrcPort,
    testDstIPv4,
    testDstIPv6,
    testDstPort,
    testGeoIP,
    testNetwork,
    testUID,
    enabledTestItems, // 确保 enabledTestItems 在依赖数组中
    ruleEngine,
    toast,
    isTestingInProgress,
  ]);

  // 自动测试效果
  useEffect(() => {
    if (autoTest) {
      if (autoTestDelay) {
        clearTimeout(autoTestDelay);
      }
      const delay = setTimeout(() => {
        testRules();
      }, autoTestDelayMs);
      setAutoTestDelay(delay);
    }
    return () => {
      if (autoTestDelay) {
        clearTimeout(autoTestDelay);
      }
    };
  }, [
    testDomain,
    testProcess,
    testProcessPath,
    testSrcIPv4,
    testSrcIPv6,
    testSrcPort,
    testDstIPv4,
    testDstIPv6,
    testDstPort,
    testGeoIP,
    testNetwork,
    testUID,
    enabledTestItems, // 添加 enabledTestItems 到依赖数组
    autoTest,
    autoTestDelayMs,
    testRules,
  ]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        testRules();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [testRules]);

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-foreground">
                Clash Rule Tester
              </h1>
              <Badge variant="outline" className="text-xs">
                规则数：{ruleCount}
              </Badge>
              {hasError && (
                <Badge variant="destructive" className="text-xs">
                  错误：{errorCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* 主题切换 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {isDark
                      ? <Moon className="h-4 w-4" />
                      : <Sun className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelp(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* 左侧栏 - 快速规则创建和策略管理 */}
          <div className="col-span-3 space-y-6 overflow-y-auto">
            <QuickRuleCreator
              policies={policies}
              onAddRule={(ruleType, content, policy) => {
                const newRule = `${ruleType},${content},${policy}`;
                setRules((prev) => prev + "\n" + newRule);
                toast({
                  title: "规则已添加",
                  description: "新规则已添加到配置中。",
                });
              }}
            />

            <PolicyManager
              policies={policies}
              onAddPolicy={(name, comment) => {
                const newPolicy: Policy = {
                  id: `policy-${Date.now()}-${
                    Math.random().toString(36).substring(2, 11)
                  }`,
                  name,
                  comment,
                  createdAt: Date.now(),
                };
                setPolicies((prev) => [...prev, newPolicy]);
              }}
              onUpdatePolicy={(id, name, comment) => {
                setPolicies((prev) =>
                  prev.map((p) => p.id === id ? { ...p, name, comment } : p)
                );
              }}
              onDeletePolicy={(id) => {
                setPolicies((prev) => prev.filter((p) => p.id !== id));
              }}
              onImportPolicies={() => {
                // TODO: 实现策略导入
                toast({
                  title: "功能开发中",
                  description: "策略导入功能正在开发中。",
                });
              }}
              onExportPolicies={() => {
                // TODO: 实现策略导出
                toast({
                  title: "功能开发中",
                  description: "策略导出功能正在开发中。",
                });
              }}
            />
          </div>

          {/* 中间栏 - 规则编辑器和测试结果 */}
          <div className="col-span-6 flex flex-col">
            <div className="flex-1 mb-4">
              <RuleEditor
                rules={rules}
                onRulesChange={setRules}
                highlightedLine={highlightedLine}
                ruleCount={ruleCount}
                hasError={hasError}
                errorCount={errorCount}
                policies={policies}
                geoIPCountries={geoIPCountries}
                networkTypes={networkTypes}
              />
            </div>

            <TestResult
              matchResult={matchResult}
              matchResultExpanded={matchResultExpanded}
              onToggleExpanded={() =>
                setMatchResultExpanded(!matchResultExpanded)}
              isTestingInProgress={isTestingInProgress}
              ruleExplanation={ruleExplanation}
              isExplaining={isExplaining}
              onExplainRule={() => {
                // TODO: 实现 AI 解释功能
                toast({
                  title: "功能开发中",
                  description: "AI 解释功能正在开发中。",
                });
              }}
              aiConfigured={!!aiSettings.apiKey}
            />
          </div>

          {/* 右侧栏 - 测试器、历史和指标 */}
          <div className="col-span-3 space-y-6 overflow-y-auto">
            <RuleTester
              testDomain={testDomain}
              setTestDomain={setTestDomain}
              testSrcIPv4={testSrcIPv4}
              setTestSrcIPv4={setTestSrcIPv4}
              testSrcIPv6={testSrcIPv6}
              setTestSrcIPv6={setTestSrcIPv6}
              testSrcPort={testSrcPort}
              setTestSrcPort={setTestSrcPort}
              testDstIPv4={testDstIPv4}
              setTestDstIPv4={setTestDstIPv4}
              testDstIPv6={testDstIPv6}
              setTestDstIPv6={setTestDstIPv6}
              testDstPort={testDstPort}
              setTestDstPort={setTestDstPort}
              testProcess={testProcess}
              setTestProcess={setTestProcess}
              testProcessPath={testProcessPath}
              setTestProcessPath={setTestProcessPath}
              testGeoIP={testGeoIP}
              setTestGeoIP={setTestGeoIP}
              testNetwork={testNetwork}
              setTestNetwork={setTestNetwork}
              testUID={testUID}
              setTestUID={setTestUID}
              enabledTestItems={enabledTestItems}
              setEnabledTestItems={setEnabledTestItems}
              srcIPType={srcIPType}
              setSrcIPType={setSrcIPType}
              dstIPType={dstIPType}
              setDstIPType={setDstIPType}
              autoTest={autoTest}
              setAutoTest={setAutoTest}
              autoTestDelayMs={autoTestDelayMs}
              setAutoTestDelayMs={setAutoTestDelayMs}
              onTestRules={testRules}
              isTestingInProgress={isTestingInProgress}
              geoIPCountries={geoIPCountries}
              networkTypes={networkTypes}
              onAddCountry={() => {
                const trimmed = newCountryCode.trim().toUpperCase();
                if (trimmed && !geoIPCountries.includes(trimmed)) {
                  setGeoIPCountries((prev) => [...prev, trimmed]);
                  setNewCountryCode("");
                }
              }}
              onRemoveCountry={(country) => {
                setGeoIPCountries((prev) => prev.filter((c) => c !== country));
              }}
              onAddNetworkType={() => {
                const trimmed = newNetworkType.trim().toLowerCase();
                if (trimmed && !networkTypes.includes(trimmed)) {
                  setNetworkTypes((prev) => [...prev, trimmed]);
                  setNewNetworkType("");
                }
              }}
              onRemoveNetworkType={(type) => {
                setNetworkTypes((prev) => prev.filter((t) => t !== type));
              }}
              newCountryCode={newCountryCode}
              setNewCountryCode={setNewCountryCode}
              newNetworkType={newNetworkType}
              setNewNetworkType={setNewNetworkType}
            />

            <TestMetrics
              testMetrics={testMetrics}
              onExportTestHistory={() => {
                // TODO: 实现测试历史导出
                toast({
                  title: "功能开发中",
                  description: "测试历史导出功能正在开发中。",
                });
              }}
              onClearTestHistory={() => {
                setTestHistory([]);
                setTestMetrics(DEFAULT_TEST_METRICS);
                toast({
                  title: "历史已清除",
                  description: "测试历史和指标已重置。",
                });
              }}
            />

            <TestHistory testHistory={testHistory} />
          </div>
        </div>
      </main>

      {/* 对话框 */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        aiSettings={aiSettings}
        onAISettingsChange={setAISettings}
      />

      <HelpDialog
        open={showHelp}
        onOpenChange={setShowHelp}
      />
    </div>
  );
}
