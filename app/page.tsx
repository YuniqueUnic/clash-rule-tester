"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Download,
  HelpCircle,
  Loader2,
  Monitor,
  Moon,
  Settings,
  Sparkles,
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
import { useTheme } from "next-themes";
import { DataProvider, useDataContext } from "@/contexts/data-context";
import {
  ClashRuleEngine,
  type MatchResult,
  type TestRequest,
} from "@/lib/clash-rule-engine";
import {
  ClashDataSources,
  DEFAULT_ENABLED_TEST_ITEMS,
  DEFAULT_TEST_METRICS,
  type EnabledTestItems,
  GEOIP_COUNTRIES,
  type GeoIPCountryData,
  GEOSITE_CATEGORIES,
  IP_TO_ASN_MAP,
  IP_TO_COUNTRY_MAP,
  NETWORK_TYPES,
  type NetworkTypeData,
  POLICIES,
  type PolicyData,
  RULE_SETS,
  SAMPLE_RULES,
  type TestMetrics as TestMetricsType,
} from "@/lib/clash-data-sources";
import { AIService } from "@/lib/ai-service";

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

function ClashRuleTester() {
  // 主题管理
  const { setTheme } = useTheme();
  const { toast } = useToast();

  // 数据管理 Context
  const {
    policies,
    geoIPCountries,
    networkTypes,
    geoSiteData,
    asnData,
    addPolicy,
    updatePolicy,
    deletePolicy,
    addGeoIP,
    updateGeoIP,
    deleteGeoIP,
    addNetworkType,
    updateNetworkType,
    deleteNetworkType,
    addGeoSite,
    updateGeoSite,
    deleteGeoSite,
    addASN,
    updateASN,
    deleteASN,
    togglePolicyEnabled,
    toggleGeoIPEnabled,
    toggleNetworkTypeEnabled,
    toggleGeoSiteEnabled,
    toggleASNEnabled,
    getEnabledPolicies,
    getEnabledGeoIP,
    getEnabledNetworkTypes,
    getEnabledGeoSite,
    getEnabledASN,
    importPolicies,
  } = useDataContext();

  // 核心状态
  const [rules, setRules] = useState(SAMPLE_RULES);
  const ruleEngine = useState(() => new ClashRuleEngine(rules))[0];
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchResultExpanded, setMatchResultExpanded] = useState(true);
  const [highlightedLine, setHighlightedLine] = useState<number | undefined>();
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);

  // 验证结果

  /// TODO: 存在问题需要修复：
  /// 1. 当我在编辑器中写了错误的语法时，我能看到错误提示
  /// 2. 但是当我又去点击其他地方的 UI，控件时，比如策略管理，然后新加了一个策略，我原本的错误的语法这时仍是存在的，但是 UI 上却没有错误提示了
  const validationResults = useMemo(() => {
    return ruleEngine.validateRules();
  }, [rules, ruleEngine]);

  // 策略管理现在通过 DataContext 处理

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

  // GeoIP、GeoSite 和 ASN 数据现在通过 DataContext 管理
  // 为了兼容现有组件，创建映射，只使用已启用的数据
  const enabledGeoIPCountries = getEnabledGeoIP();
  const enabledGeoSiteData = getEnabledGeoSite();
  const enabledASNData = getEnabledASN();

  const geoIPDatabase = Object.fromEntries(
    enabledGeoIPCountries.map((country) => [country.code, country.name]),
  );

  const geoSiteDataMap = Object.fromEntries(
    enabledGeoSiteData.map((site) => [site.category, site.domains]),
  );

  const asnDataMap = Object.fromEntries(
    enabledASNData.map((asn) => [asn.ip, asn.asn]),
  );

  const [ruleSetData, setRuleSetData] = useState<
    Record<string, (request: TestRequest) => boolean>
  >(
    () => RULE_SETS,
  );

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

  // 数据源管理现在通过 DataContext 处理
  // 为了兼容现有组件，创建映射，只使用已启用的数据
  const enabledNetworkTypes = getEnabledNetworkTypes();
  const geoIPCountryCodes = enabledGeoIPCountries.map((c) => c.code);
  const networkTypesList = enabledNetworkTypes.map((n) => n.type);

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
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 统计信息
  const ruleCount = ruleEngine.getRuleCount();
  const hasError = validationResults.length > 0;
  const errorCount = validationResults.length;

  // AI 服务
  const aiService = new AIService(aiSettings);

  // 更新规则引擎和 GeoIP/GeoSite/ASN/Rule Set 数据
  useEffect(() => {
    try {
      ruleEngine.updateRules(rules);
      ruleEngine.setGeoIPDatabase(geoIPDatabase);
      ruleEngine.setGeoSiteData(geoSiteDataMap);
      ruleEngine.setASNData(asnDataMap);
      ruleEngine.setRuleSetData(ruleSetData);
    } catch (error) {
      console.error("Failed to update rules or data:", error);
    }
  }, [
    rules,
    ruleEngine,
    geoIPDatabase,
    geoSiteDataMap,
    asnDataMap,
    ruleSetData,
  ]);

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

  // 添加快速规则函数
  const addQuickRule = (ruleType: string, content: string, policy: string) => {
    const newRule = `${ruleType},${content},${policy}`;
    setRules((prev) => prev + "\n" + newRule);
    toast({
      title: "规则已添加",
      description: "新规则已添加到配置中。",
    });
  };

  // AI 优化规则函数
  const optimizeRules = async () => {
    if (!aiService.isConfigured()) {
      toast({
        title: "AI 未配置",
        description: "请先配置 AI 设置。",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const optimizedRules = await aiService.optimizeRules(rules);
      setRules(optimizedRules);
      toast({
        title: "规则已优化",
        description: "规则已通过 AI 优化。",
      });
    } catch (error) {
      toast({
        title: "优化失败",
        description: error instanceof Error ? error.message : "规则优化失败",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // AI 解释规则函数
  const explainRule = async () => {
    if (!matchResult || !aiService.isConfigured()) {
      toast({
        title: "无法解释规则",
        description: !matchResult ? "尚未匹配到规则。" : "请先配置 AI 设置。",
        variant: "destructive",
      });
      return;
    }

    setIsExplaining(true);
    try {
      const explanation = await aiService.explainRule(
        matchResult.rule,
        matchResult.explanation,
      );
      setRuleExplanation(explanation);
    } catch (error) {
      toast({
        title: "解释失败",
        description: error instanceof Error ? error.message : "规则解释失败",
        variant: "destructive",
      });
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                C
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">
                CLASH 规则测试器
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                专业的规则引擎测试工具
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <HelpDialog />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-accent/80 transition-colors bg-transparent h-8 w-8 p-0"
                >
                  <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">切换主题</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  浅色
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  深色
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  跟随系统
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <SettingsDialog
              onSettingsChange={setAISettings}
              policies={policies}
              geoIPCountries={geoIPCountries}
              networkTypes={networkTypes}
              geoSiteData={geoSiteData}
              asnData={asnData}
              onPolicyAdd={addPolicy}
              onPolicyEdit={updatePolicy}
              onPolicyDelete={deletePolicy}
              onGeoIPAdd={addGeoIP}
              onGeoIPEdit={updateGeoIP}
              onGeoIPDelete={deleteGeoIP}
              onNetworkTypeAdd={addNetworkType}
              onNetworkTypeEdit={updateNetworkType}
              onNetworkTypeDelete={deleteNetworkType}
              onGeoSiteAdd={addGeoSite}
              onGeoSiteEdit={updateGeoSite}
              onGeoSiteDelete={deleteGeoSite}
              onASNAdd={addASN}
              onASNEdit={updateASN}
              onASNDelete={deleteASN}
              onTogglePolicyEnabled={togglePolicyEnabled}
              onToggleGeoIPEnabled={toggleGeoIPEnabled}
              onToggleNetworkTypeEnabled={toggleNetworkTypeEnabled}
              onToggleGeoSiteEnabled={toggleGeoSiteEnabled}
              onToggleASNEnabled={toggleASNEnabled}
            />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Column: Quick Rule Builder & Policy Management */}
        <div className="w-80 border-r border-border bg-sidebar/30 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* AI Optimization */}
            <Button
              variant="outline"
              className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 bg-transparent hover:bg-accent/80 rounded-md"
              size="sm"
              onClick={optimizeRules}
              disabled={!aiService.isConfigured() || isOptimizing}
            >
              {isOptimizing
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-2" />}
              AI 优化规则
            </Button>

            {/* Quick Rule Builder */}
            <QuickRuleCreator
              policies={getEnabledPolicies()}
              onAddRule={addQuickRule}
            />

            {/* Policy Management */}
            <PolicyManager
              policies={getEnabledPolicies().map((p) => ({
                id: p.id,
                name: p.name,
                comment: p.description,
                createdAt: p.createdAt,
              }))}
              onAddPolicy={(name, comment) => {
                addPolicy({
                  name,
                  type: "custom",
                  description: comment || "",
                  category: "custom",
                  enabled: true, // 新策略默认启用
                });
              }}
              onUpdatePolicy={(id, name, comment) => {
                updatePolicy(id, {
                  name,
                  description: comment || "",
                });
              }}
              onDeletePolicy={deletePolicy}
              onImportPolicies={() => {
                // 导入策略功能
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const importedPolicies = JSON.parse(
                          e.target?.result as string,
                        );
                        if (Array.isArray(importedPolicies)) {
                          const validPolicies = importedPolicies.filter((p) =>
                            p && typeof p.name === "string" && p.name.trim()
                          ).map((p) => ({
                            ...p,
                            type: p.type || "custom",
                            description: p.description || p.comment || "",
                            category: p.category || "custom",
                          }));
                          importPolicies(validPolicies);
                          toast({
                            title: "导入成功",
                            description:
                              `成功导入 ${validPolicies.length} 个策略`,
                          });
                        } else {
                          throw new Error("Invalid format");
                        }
                      } catch (error) {
                        toast({
                          title: "导入失败",
                          description: "文件格式不正确，请选择有效的策略文件",
                          variant: "destructive",
                        });
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              onExportPolicies={() => {
                // 导出策略功能
                const dataStr = JSON.stringify(policies, null, 2);
                const dataBlob = new Blob([dataStr], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `clash-policies-${
                  new Date().toISOString().split("T")[0]
                }.json`;
                link.click();
                URL.revokeObjectURL(url);
                toast({
                  title: "导出成功",
                  description: `已导出 ${policies.length} 个策略`,
                });
              }}
            />

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <div className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 rounded-md p-3 border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800 dark:text-amber-200 text-sm">
                    发现 {validationResults.length} 个规则验证问题
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Rule Editor with VSCode-like layout */}
        <div className="flex-1 flex flex-col h-full">
          {/* Editor Area - dynamic height based on bottom panel state */}
          <div
            className={`bg-card overflow-hidden transition-all duration-300 ${
              matchResultExpanded
                ? "h-[calc(100%-16rem)]"
                : "h-[calc(100%-3rem)]"
            }`}
          >
            <RuleEditor
              rules={rules}
              onRulesChange={setRules}
              highlightedLine={highlightedLine}
              ruleCount={ruleCount}
              hasError={hasError}
              errorCount={errorCount}
              policies={policies}
              geoIPCountries={geoIPCountryCodes}
              networkTypes={networkTypesList}
              currentGeoIPCountries={geoIPCountryCodes}
              currentNetworkTypes={networkTypesList}
            />
          </div>

          {/* Bottom Panel - Dynamic height like VSCode bottom panel */}
          <TestResult
            matchResult={matchResult}
            matchResultExpanded={matchResultExpanded}
            onToggleExpanded={() =>
              setMatchResultExpanded(!matchResultExpanded)}
            isTestingInProgress={isTestingInProgress}
            ruleExplanation={ruleExplanation}
            isExplaining={isExplaining}
            onExplainRule={explainRule}
            aiConfigured={aiService.isConfigured()}
          />
        </div>

        {/* Right Column: Enhanced Test Panel and Results */}
        <div className="w-96 border-l border-border overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* Enhanced Test Request Panel */}
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
              geoIPCountries={geoIPCountryCodes}
              networkTypes={networkTypesList}
              onAddCountry={() => {
                const code = newCountryCode.trim().toUpperCase();
                if (code && !geoIPCountryCodes.includes(code)) {
                  // 添加到 DataContext 中
                  addGeoIP({
                    code,
                    name: code, // 临时使用代码作为名称
                    continent: "Unknown",
                    popular: false,
                    enabled: true, // 新 GeoIP 项目默认启用
                  });
                  setNewCountryCode("");
                  toast({
                    title: "国家已添加",
                    description: `国家代码 ${code} 已添加`,
                  });
                }
              }}
              onRemoveCountry={(country) => {
                // 从 DataContext 中删除
                const countryItem = geoIPCountries.find((c) =>
                  c.code === country
                );
                if (countryItem) {
                  deleteGeoIP(countryItem.id);
                  toast({
                    title: "国家已删除",
                    description: `国家代码 ${country} 已删除`,
                  });
                }
              }}
              onAddNetworkType={() => {
                const type = newNetworkType.trim().toUpperCase();
                if (type && !networkTypesList.includes(type)) {
                  // 添加到 DataContext 中
                  addNetworkType({
                    type,
                    description: `自定义网络类型：${type}`,
                    category: "transport",
                    enabled: true, // 新网络类型默认启用
                  });
                  setNewNetworkType("");
                  toast({
                    title: "网络类型已添加",
                    description: `网络类型 ${type} 已添加`,
                  });
                }
              }}
              onRemoveNetworkType={(type) => {
                // 从 DataContext 中删除
                const networkTypeItem = networkTypes.find((n) =>
                  n.type === type
                );
                if (networkTypeItem) {
                  deleteNetworkType(networkTypeItem.id);
                  toast({
                    title: "网络类型已删除",
                    description: `网络类型 ${type} 已删除`,
                  });
                }
              }}
              newCountryCode={newCountryCode}
              setNewCountryCode={setNewCountryCode}
              newNetworkType={newNetworkType}
              setNewNetworkType={setNewNetworkType}
            />

            <TestMetrics
              testMetrics={testMetrics}
              onExportTestHistory={() => {
                const data = {
                  exportTime: new Date().toISOString(),
                  metrics: testMetrics,
                  history: testHistory,
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `clash-test-history-${
                  new Date().toISOString().split("T")[0]
                }.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                toast({
                  title: "导出成功",
                  description: "测试历史已导出到文件",
                });
              }}
              onClearTestHistory={() => {
                setTestHistory([]);
                setTestMetrics({
                  totalTests: 0,
                  averageTime: 0,
                  successRate: 0,
                  lastTestTime: 0,
                });
                toast({
                  title: "历史已清除",
                  description: "所有测试历史和指标已清除",
                });
              }}
            />

            <TestHistory testHistory={testHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 包装组件，提供 DataContext
function ClashRuleTesterWithProvider() {
  return (
    <DataProvider>
      <ClashRuleTester />
    </DataProvider>
  );
}

// 导出包装后的组件
export default ClashRuleTesterWithProvider;
