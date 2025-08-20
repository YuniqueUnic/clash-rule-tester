"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  HelpCircle,
  History,
  Keyboard,
  Loader2,
  Monitor,
  Moon,
  Play,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClashRuleEditor } from "@/components/clash-rule-editor";
import {
  ClashRuleEngine,
  type MatchResult,
  type TestRequest,
} from "@/lib/clash-rule-engine";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsDialog } from "@/components/settings-dialog";
import { HelpDialog } from "@/components/help-dialog";
import { AIService } from "@/lib/ai-service";
import { useToast } from "@/hooks/use-toast";
import { ClashDataSources } from "@/lib/clash-data-sources";

const SAMPLE_RULES = `# CLASH Rules Configuration
# Domain rules
DOMAIN-SUFFIX,google.com,PROXY
DOMAIN-SUFFIX,github.com,DIRECT
DOMAIN-KEYWORD,youtube,PROXY
DOMAIN,www.example.com,REJECT

# IP rules
IP-CIDR,192.168.0.0/16,DIRECT
IP-CIDR,10.0.0.0/8,DIRECT
IP-CIDR,8.8.8.0/24,PROXY
GEOIP,CN,DIRECT
GEOIP,US,PROXY

# Process rules
PROCESS-NAME,chrome.exe,PROXY
PROCESS-NAME,firefox.exe,DIRECT

# Port rules
DST-PORT,443,PROXY
DST-PORT,80,DIRECT

# Final rule
MATCH,PROXY`;

interface AISettings {
  provider: "openai" | "gemini" | "openai-compatible" | "";
  apiKey: string;
  model: string;
}

interface Policy {
  id: string;
  name: string;
  comment?: string;
}

interface TestHistory {
  id: string;
  timestamp: number;
  request: TestRequest;
  result: MatchResult | null;
  duration: number;
}

interface TestMetrics {
  totalTests: number;
  averageTime: number;
  successRate: number; // 以百分比形式存储，0 表示 0%
  lastTestTime: number;
}

export default function ClashRuleTester() {
  const [rules, setRules] = useState(SAMPLE_RULES);
  const [testDomain, setTestDomain] = useState("www.google.com");
  const [testProcess, setTestProcess] = useState("chrome.exe");
  const [testProcessPath, setTestProcessPath] = useState("/usr/bin/chrome");

  // 新增的测试输入字段
  const [testSrcIPv4, setTestSrcIPv4] = useState("192.168.1.100");
  const [testSrcIPv6, setTestSrcIPv6] = useState("2001:db8::1");
  const [testSrcPort, setTestSrcPort] = useState("12345");
  const [testDstIPv4, setTestDstIPv4] = useState("8.8.8.8");
  const [testDstIPv6, setTestDstIPv6] = useState("2001:4860:4860::8888");
  const [testDstPort, setTestDstPort] = useState("443");
  const [testGeoIP, setTestGeoIP] = useState("US");
  const [testNetwork, setTestNetwork] = useState("TCP");
  const [testUID, setTestUID] = useState("1000");

  // 网络类型管理 - 使用真实数据源
  const [networkTypes, setNetworkTypes] = useState(() =>
    ClashDataSources.getNetworkTypes().map((n) => n.type)
  );
  const [newNetworkType, setNewNetworkType] = useState("");

  // IP 类型选择
  const [srcIPType, setSrcIPType] = useState<"ipv4" | "ipv6" | "both">("both");
  const [dstIPType, setDstIPType] = useState<"ipv4" | "ipv6" | "both">("both");

  // 测试项目启用状态
  const [enabledTestItems, setEnabledTestItems] = useState({
    domain: true,
    srcIP: false,
    srcPort: false,
    dstIP: true,
    dstPort: true,
    process: false,
    processPath: false,
    geoIP: true,
    network: true,
    uid: false,
  });

  // 匹配结果面板展开状态
  const [matchResultExpanded, setMatchResultExpanded] = useState(true);

  // GeoIP 国家代码管理 - 使用真实数据源
  const [geoIPCountries, setGeoIPCountries] = useState(() =>
    ClashDataSources.getGeoIPCountries(true).map((c) => c.code)
  );
  const [newCountryCode, setNewCountryCode] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [newRuleType, setNewRuleType] = useState("");
  const [newRuleContent, setNewRuleContent] = useState("");
  const [newRulePolicy, setNewRulePolicy] = useState("");
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: "",
    apiKey: "",
    model: "",
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [ruleExplanation, setRuleExplanation] = useState<string>("");

  const [autoTest, setAutoTest] = useState(false);
  const [autoTestDelay, setAutoTestDelay] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [autoTestDelayMs, setAutoTestDelayMs] = useState(500);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    totalTests: 0,
    averageTime: 0,
    successRate: 0, // 以百分比形式存储，0 表示 0%
    lastTestTime: 0,
  });
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);

  const [policies, setPolicies] = useState<Policy[]>(() =>
    ClashDataSources.getPolicies().map((p, index) => ({
      id: (index + 1).toString(),
      name: p.name,
      comment: p.description,
    }))
  );
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyComment, setNewPolicyComment] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  const { setTheme } = useTheme();
  const { toast } = useToast();

  const ruleEngine = useMemo(() => new ClashRuleEngine(rules), [rules]);
  const validationResults = useMemo(() => ruleEngine.validateRules(), [
    ruleEngine,
  ]);
  const aiService = useMemo(() => new AIService(aiSettings), [aiSettings]);

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
    autoTest,
    autoTestDelayMs,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "Enter":
            e.preventDefault();
            testRules();
            break;
          case "k":
            e.preventDefault();
            document.getElementById("test-domain")?.focus();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const testRules = useCallback(() => {
    const startTime = performance.now();
    setIsTestingInProgress(true);

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

    // Add to test history
    const historyEntry: TestHistory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      request: { ...testRequest },
      result,
      duration,
    };

    setTestHistory((prev) => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 tests

    // Update metrics
    setTestMetrics((prev) => {
      const newTotal = prev.totalTests + 1;
      const newAverageTime = (prev.averageTime * prev.totalTests + duration) /
        newTotal;
      // 计算成功次数：之前的成功次数 + 当前是否成功 (1 或 0)
      const newSuccessCount =
        Math.round(prev.successRate * prev.totalTests / 100) + (result ? 1 : 0);
      const newSuccessRate = (newSuccessCount / newTotal) * 100;

      return {
        totalTests: newTotal,
        averageTime: newAverageTime,
        successRate: newSuccessRate,
        lastTestTime: duration,
      };
    });

    setMatchResult(result);
    setRuleExplanation("");
    setIsTestingInProgress(false);

    if (result) {
      toast({
        title: "测试完成",
        description: `匹配到规则：${result.policy}`,
      });
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
    ruleEngine,
    toast,
  ]);

  const addQuickRule = () => {
    if (newRuleType && newRuleContent && newRulePolicy) {
      const newRule = `${newRuleType},${newRuleContent},${newRulePolicy}`;
      setRules((prev) => prev + "\n" + newRule);
      setNewRuleType("");
      setNewRuleContent("");
      setNewRulePolicy("");
      toast({
        title: "规则已添加",
        description: "新规则已添加到配置中。",
      });
    }
  };

  const addPolicy = () => {
    if (newPolicyName.trim()) {
      const newPolicy: Policy = {
        id: Date.now().toString(),
        name: newPolicyName.trim(),
        comment: newPolicyComment.trim() || undefined,
      };
      setPolicies([...policies, newPolicy]);
      setNewPolicyName("");
      setNewPolicyComment("");
      toast({
        title: "策略已添加",
        description: `策略 "${newPolicy.name}" 已添加。`,
      });
    }
  };

  // 导入策略
  const importPolicies = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedPolicies = JSON.parse(e.target?.result as string);
            if (Array.isArray(importedPolicies)) {
              // 验证导入的策略格式
              const validPolicies = importedPolicies.filter((p) =>
                p && typeof p.name === "string" && p.name.trim()
              ).map((p) => ({
                ...p,
                id: Date.now().toString() +
                  Math.random().toString(36).substr(2, 9),
              }));
              setPolicies([...policies, ...validPolicies]);
              toast({
                title: "导入成功",
                description: `成功导入 ${validPolicies.length} 个策略`,
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
  };

  // 导出策略
  const exportPolicies = () => {
    const dataStr = JSON.stringify(policies, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
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
  };

  const deletePolicy = (id: string) => {
    setPolicies(policies.filter((p) => p.id !== id));
    toast({
      title: "策略已删除",
      description: "策略已从列表中删除。",
    });
  };

  const updatePolicy = (id: string, name: string, comment?: string) => {
    setPolicies(
      policies.map((
        p,
      ) => (p.id === id
        ? { ...p, name: name.trim(), comment: comment?.trim() || undefined }
        : p)
      ),
    );
    setEditingPolicy(null);
    toast({
      title: "策略已更新",
      description: "策略信息已更新。",
    });
  };

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

  const exportTestHistory = () => {
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
  };

  const clearTestHistory = () => {
    setTestHistory([]);
    setTestMetrics({
      totalTests: 0,
      averageTime: 0,
      successRate: 0, // 以百分比形式存储，0 表示 0%
      lastTestTime: 0,
    });
    toast({
      title: "历史已清除",
      description: "所有测试历史和指标已清除",
    });
  };

  const addCountry = () => {
    const code = newCountryCode.trim().toUpperCase();
    if (code && !geoIPCountries.includes(code)) {
      setGeoIPCountries([...geoIPCountries, code]);
      setNewCountryCode("");
      toast({
        title: "国家已添加",
        description: `国家代码 ${code} 已添加`,
      });
    }
  };

  const removeCountry = (country: string) => {
    setGeoIPCountries(geoIPCountries.filter((c) => c !== country));
    toast({
      title: "国家已删除",
      description: `国家代码 ${country} 已删除`,
    });
  };

  const addNetworkType = () => {
    const type = newNetworkType.trim().toUpperCase();
    if (type && !networkTypes.includes(type)) {
      setNetworkTypes([...networkTypes, type]);
      setNewNetworkType("");
      toast({
        title: "网络类型已添加",
        description: `网络类型 ${type} 已添加`,
      });
    }
  };

  const removeNetworkType = (type: string) => {
    setNetworkTypes(networkTypes.filter((t) => t !== type));
    toast({
      title: "网络类型已删除",
      description: `网络类型 ${type} 已删除`,
    });
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

            <SettingsDialog onSettingsChange={setAiSettings} />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Column: Quick Rule Builder & Policy Management */}
        <div className="w-80 border-r border-border bg-sidebar/30 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* Quick Rule Builder */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Plus className="h-4 w-4" />
                  快速规则构建器
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-type" className="text-foreground">
                    规则类型
                  </Label>
                  <Select value={newRuleType} onValueChange={setNewRuleType}>
                    <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md">
                      <SelectValue placeholder="选择规则类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOMAIN">DOMAIN</SelectItem>
                      <SelectItem value="DOMAIN-SUFFIX">
                        DOMAIN-SUFFIX
                      </SelectItem>
                      <SelectItem value="DOMAIN-KEYWORD">
                        DOMAIN-KEYWORD
                      </SelectItem>
                      <SelectItem value="IP-CIDR">IP-CIDR</SelectItem>
                      <SelectItem value="IP-CIDR6">IP-CIDR6</SelectItem>
                      <SelectItem value="GEOIP">GEOIP</SelectItem>
                      <SelectItem value="PROCESS-NAME">PROCESS-NAME</SelectItem>
                      <SelectItem value="PROCESS-PATH">PROCESS-PATH</SelectItem>
                      <SelectItem value="DST-PORT">DST-PORT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-content" className="text-foreground">
                    内容
                  </Label>
                  <Input
                    id="rule-content"
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    placeholder="例如：google.com"
                    className="hover:bg-accent/60 transition-colors rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-policy" className="text-foreground">
                    策略
                  </Label>
                  <Select
                    value={newRulePolicy}
                    onValueChange={setNewRulePolicy}
                  >
                    <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md">
                      <SelectValue placeholder="选择策略" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.name}>
                          {policy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={addQuickRule}
                  className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 rounded-md"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加规则
                </Button>
              </div>
            </div>

            {/* Policy Management */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Settings className="h-4 w-4" />
                  策略管理
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Add New Policy */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="策略名称"
                      value={newPolicyName}
                      onChange={(e) => setNewPolicyName(e.target.value)}
                      className="flex-1 rounded-md"
                    />
                    <Button
                      onClick={addPolicy}
                      size="sm"
                      disabled={!newPolicyName.trim()}
                      className="rounded-md"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="策略注释（可选）"
                    value={newPolicyComment}
                    onChange={(e) => setNewPolicyComment(e.target.value)}
                    className="text-xs rounded-md"
                  />
                </div>

                {/* Policy List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(Number(policy.id)).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{policy.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{policy.name}</span>
                        {policy.comment && (
                          <Badge variant="outline" className="text-xs h-4">
                            {policy.comment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent rounded-md"
                    size="sm"
                    onClick={importPolicies}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    导入策略
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent rounded-md"
                    size="sm"
                    onClick={exportPolicies}
                    disabled={policies.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    导出策略
                  </Button>
                </div>
              </div>
            </div>

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

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  发现 {validationResults.length} 个规则验证问题
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Middle Column: Rule Editor with VSCode-like layout */}
        <div className="flex-1 flex flex-col h-full">
          {/* Editor Area - dynamic height based on bottom panel state */}
          <div
            className={`bg-card overflow-hidden transition-all duration-300 ${
              matchResultExpanded
                ? "h-[calc(100%-12rem)]"
                : "h-[calc(100%-3rem)]"
            }`}
          >
            <ClashRuleEditor
              value={rules}
              onChange={setRules}
              highlightedLine={matchResult?.lineNumber}
              className="h-full"
              ruleCount={ruleEngine.getRuleCount()}
              hasError={validationResults.length > 0}
              errorCount={validationResults.length}
              policies={policies.map((p) => p.name)}
              geoIPCountries={geoIPCountries}
              networkTypes={networkTypes}
              currentGeoIPCountries={geoIPCountries}
              currentNetworkTypes={networkTypes}
            />
          </div>

          {/* Bottom Panel - Dynamic height like VSCode bottom panel */}
          <div
            className={`bg-card border-t border-border flex flex-col transition-all duration-300 ${
              matchResultExpanded ? "h-48" : "h-12"
            }`}
          >
            <div
              className={`${
                matchResultExpanded ? "p-3 border-b border-border" : "p-2"
              } bg-muted/30`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {matchResult
                    ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-foreground">
                          匹配结果
                        </span>
                        <Badge
                          variant={matchResult.policy === "DIRECT"
                            ? "default"
                            : matchResult.policy === "PROXY"
                            ? "secondary"
                            : "destructive"}
                          className="text-xs rounded-md font-semibold"
                        >
                          {matchResult.policy}
                        </Badge>
                        {matchResultExpanded && (
                          <span>
                            <span className="text-muted-foreground text-sm">
                              代码 line {matchResult.lineNumber}{" "}
                              / 匹配规则：{matchResult.rule}
                            </span>
                          </span>
                        )}
                      </>
                    )
                    : (
                      <>
                        <Play className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          匹配结果
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs rounded-md"
                        >
                          等待测试
                        </Badge>
                      </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {isTestingInProgress && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      测试中...
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMatchResultExpanded(!matchResultExpanded)}
                    className="h-6 w-6 p-0"
                  >
                    {matchResultExpanded
                      ? <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {matchResultExpanded && (
                <div className="p-4 space-y-3">
                  {matchResult
                    ? (
                      <div className="p-3 bg-muted/40 rounded-lg border border-muted hover:bg-muted/60 transition-colors">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="font-medium text-sm text-foreground">
                            详细匹配信息
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-background/80 rounded-md border border-border/50">
                            <div className="text-foreground/90 leading-relaxed text-xs">
                              {matchResult.detailedExplanation}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-1 mt-2">
                            {matchResult.matchedContent && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground font-medium">
                                  匹配内容：
                                </span>
                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                  {matchResult.matchedContent}
                                </code>
                              </div>
                            )}
                            {matchResult.matchPosition && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground font-medium">
                                  匹配位置：
                                </span>
                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                  {matchResult.matchPosition}
                                </code>
                              </div>
                            )}
                            {matchResult.matchRange && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground font-medium">
                                  覆盖范围：
                                </span>
                                <code className="bg-accent/30 px-2 py-1 rounded text-foreground font-mono">
                                  {matchResult.matchRange}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                    : (
                      <div className="p-3 bg-muted/40 rounded-lg border border-muted hover:bg-muted/60 transition-colors">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Play className="h-4 w-4" />
                          <span className="text-sm">等待测试结果...</span>
                        </div>
                      </div>
                    )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 hover:bg-accent/80 rounded-md border border-border/50"
                    onClick={explainRule}
                    disabled={!aiService.isConfigured() || isExplaining}
                  >
                    {isExplaining
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <HelpCircle className="h-4 w-4 mr-2" />}
                    AI 深度解释规则
                  </Button>

                  {ruleExplanation && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-sm transition-all duration-200">
                      <div className="flex items-start gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                          AI 解释
                        </div>
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
                        {ruleExplanation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Enhanced Test Panel and Results */}
        <div className="w-96 border-l border-border overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* Enhanced Test Request Panel */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Play className="h-4 w-4" />
                    测试请求
                  </h3>
                  <div className="flex items-center gap-2">
                    <Toggle
                      pressed={autoTest}
                      onPressedChange={setAutoTest}
                      className="auto-test-toggle h-7 px-2 text-xs rounded-md"
                      aria-label="自动测试"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Auto
                    </Toggle>
                    <Badge variant="outline" className="text-xs rounded-md">
                      <Keyboard className="h-3 w-3 mr-1" />
                      Ctrl+Enter
                    </Badge>
                  </div>
                </div>
                {autoTest && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs">
                      自动测试延迟：{autoTestDelayMs}ms
                    </Label>
                    <Slider
                      value={[autoTestDelayMs]}
                      onValueChange={([value]) => setAutoTestDelayMs(value)}
                      min={100}
                      max={2000}
                      step={100}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-domain"
                    checked={enabledTestItems.domain}
                    onCheckedChange={(checked) =>
                      setEnabledTestItems((prev) => ({
                        ...prev,
                        domain: !!checked,
                      }))}
                  />
                  <Label
                    htmlFor="test-domain"
                    className="text-foreground text-sm min-w-[60px]"
                  >
                    域名:
                  </Label>
                  <Input
                    id="test-domain"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="www.example.com"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                    disabled={!enabledTestItems.domain}
                  />
                </div>

                {/* Source IP Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-src-ip"
                        checked={enabledTestItems.srcIP}
                        onCheckedChange={(checked) =>
                          setEnabledTestItems((prev) => ({
                            ...prev,
                            srcIP: !!checked,
                          }))}
                      />
                      <Label className="text-foreground min-w-fit">
                        源 IP:
                      </Label>
                    </div>
                    <Select
                      value={srcIPType}
                      onValueChange={(value: "ipv4" | "ipv6" | "both") =>
                        setSrcIPType(value)}
                    >
                      <SelectTrigger className="w-32 hover:bg-accent/60 transition-colors rounded-md">
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ipv4">IPv4</SelectItem>
                        <SelectItem value="ipv6">IPv6</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    {(srcIPType === "ipv4" || srcIPType === "both") && (
                      <Input
                        value={testSrcIPv4}
                        onChange={(e) => setTestSrcIPv4(e.target.value)}
                        placeholder="192.168.1.100"
                        className="hover:bg-accent/60 transition-colors rounded-md"
                        disabled={!enabledTestItems.srcIP}
                      />
                    )}
                    {(srcIPType === "ipv6" || srcIPType === "both") && (
                      <Input
                        value={testSrcIPv6}
                        onChange={(e) => setTestSrcIPv6(e.target.value)}
                        placeholder="2001:db8::1"
                        className="hover:bg-accent/60 transition-colors rounded-md"
                        disabled={!enabledTestItems.srcIP}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-src-port"
                    checked={enabledTestItems.srcPort}
                    onCheckedChange={(checked) =>
                      setEnabledTestItems((prev) => ({
                        ...prev,
                        srcPort: !!checked,
                      }))}
                  />
                  <Label
                    htmlFor="test-src-port"
                    className="text-foreground text-sm min-w-[80px]"
                  >
                    源端口:
                  </Label>
                  <Input
                    id="test-src-port"
                    value={testSrcPort}
                    onChange={(e) => setTestSrcPort(e.target.value)}
                    placeholder="12345"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                    disabled={!enabledTestItems.srcPort}
                  />
                </div>

                {/* Destination IP Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-dst-ip"
                        checked={enabledTestItems.dstIP}
                        onCheckedChange={(checked) =>
                          setEnabledTestItems((prev) => ({
                            ...prev,
                            dstIP: !!checked,
                          }))}
                      />
                      <Label className="text-foreground min-w-fit">
                        目标 IP:
                      </Label>
                    </div>
                    <Select
                      value={dstIPType}
                      onValueChange={(value: "ipv4" | "ipv6" | "both") =>
                        setDstIPType(value)}
                    >
                      <SelectTrigger className="w-32 hover:bg-accent/60 transition-colors rounded-md">
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ipv4">IPv4</SelectItem>
                        <SelectItem value="ipv6">IPv6</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    {(dstIPType === "ipv4" || dstIPType === "both") && (
                      <Input
                        value={testDstIPv4}
                        onChange={(e) => setTestDstIPv4(e.target.value)}
                        placeholder="8.8.8.8"
                        className="hover:bg-accent/60 transition-colors rounded-md"
                        disabled={!enabledTestItems.dstIP}
                      />
                    )}
                    {(dstIPType === "ipv6" || dstIPType === "both") && (
                      <Input
                        value={testDstIPv6}
                        onChange={(e) => setTestDstIPv6(e.target.value)}
                        placeholder="2001:4860:4860::8888"
                        className="hover:bg-accent/60 transition-colors rounded-md"
                        disabled={!enabledTestItems.dstIP}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-dst-port"
                    checked={enabledTestItems.dstPort}
                    onCheckedChange={(checked) =>
                      setEnabledTestItems((prev) => ({
                        ...prev,
                        dstPort: !!checked,
                      }))}
                  />
                  <Label
                    htmlFor="test-dst-port"
                    className="text-foreground text-sm min-w-[80px]"
                  >
                    目标端口:
                  </Label>
                  <Input
                    id="test-dst-port"
                    value={testDstPort}
                    onChange={(e) => setTestDstPort(e.target.value)}
                    placeholder="443"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                    disabled={!enabledTestItems.dstPort}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-process"
                    checked={enabledTestItems.process}
                    onCheckedChange={(checked) =>
                      setEnabledTestItems((prev) => ({
                        ...prev,
                        process: !!checked,
                      }))}
                  />
                  <Label
                    htmlFor="test-process"
                    className="text-foreground text-sm min-w-[60px]"
                  >
                    进程:
                  </Label>
                  <Input
                    id="test-process"
                    value={testProcess}
                    onChange={(e) => setTestProcess(e.target.value)}
                    placeholder="chrome.exe"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                    disabled={!enabledTestItems.process}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="test-process-path"
                    className="text-foreground text-sm min-w-[80px]"
                  >
                    进程路径:
                  </Label>
                  <Input
                    id="test-process-path"
                    value={testProcessPath}
                    onChange={(e) => setTestProcessPath(e.target.value)}
                    placeholder="/usr/bin/chrome"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                  />
                </div>

                {/* GeoIP Country */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="test-geoip" className="text-foreground">
                      GeoIP 国家
                    </Label>

                    {/* 国家选择器 */}
                    <Select value={testGeoIP} onValueChange={setTestGeoIP}>
                      <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md">
                        <SelectValue placeholder="选择国家" />
                      </SelectTrigger>
                      <SelectContent>
                        {geoIPCountries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 国家代码管理 */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newCountryCode}
                        onChange={(e) => setNewCountryCode(e.target.value)}
                        placeholder="输入国家代码"
                        className="flex-1 rounded-md text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addCountry();
                          }
                        }}
                      />
                      <Button
                        onClick={addCountry}
                        size="sm"
                        disabled={!newCountryCode.trim()}
                        className="px-3 rounded-md"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {geoIPCountries.map((country) => (
                        <Badge
                          key={country}
                          variant="secondary"
                          className="text-xs px-2 py-1 cursor-pointer hover:bg-accent/80"
                          onClick={() => removeCountry(country)}
                        >
                          {country} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 网络类型管理 */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="test-network" className="text-foreground">
                      网络类型
                    </Label>

                    {/* 网络类型选择器 */}
                    <Select value={testNetwork} onValueChange={setTestNetwork}>
                      <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md">
                        <SelectValue placeholder="选择网络类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {networkTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 网络类型管理 */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newNetworkType}
                        onChange={(e) => setNewNetworkType(e.target.value)}
                        placeholder="输入网络类型"
                        className="flex-1 rounded-md text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addNetworkType();
                          }
                        }}
                      />
                      <Button
                        onClick={addNetworkType}
                        size="sm"
                        disabled={!newNetworkType.trim()}
                        className="px-3 rounded-md"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {networkTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="secondary"
                          className="text-xs px-2 py-1 cursor-pointer hover:bg-accent/80"
                          onClick={() => removeNetworkType(type)}
                        >
                          {type} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="test-uid"
                    className="text-foreground text-sm min-w-[80px]"
                  >
                    用户 ID:
                  </Label>
                  <Input
                    id="test-uid"
                    value={testUID}
                    onChange={(e) => setTestUID(e.target.value)}
                    placeholder="1000"
                    className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                  />
                </div>

                {!autoTest && (
                  <Button
                    onClick={testRules}
                    className="w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 rounded-md"
                    disabled={isTestingInProgress}
                  >
                    {isTestingInProgress
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Play className="h-4 w-4 mr-2" />}
                    测试规则
                  </Button>
                )}
              </div>
            </div>

            {/* Test Metrics Panel */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    测试指标
                  </h3>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">总测试数</div>
                    <div className="font-semibold">
                      {testMetrics.totalTests}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">成功率</div>
                    <div className="font-semibold">
                      {testMetrics.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">平均耗时</div>
                    <div className="font-semibold">
                      {testMetrics.averageTime.toFixed(2)}ms
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">最近耗时</div>
                    <div className="font-semibold flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {testMetrics.lastTestTime.toFixed(2)}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test History Panel */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <History className="h-4 w-4" />
                    测试历史
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={exportTestHistory}
                      disabled={testHistory.length === 0}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={clearTestHistory}
                      disabled={testHistory.length === 0}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {testHistory.length > 0
                  ? (
                    <div className="p-2 space-y-2">
                      {testHistory.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{entry.duration.toFixed(1)}ms</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono">
                              {entry.request.domain || entry.request.dstIPv4 ||
                                entry.request.srcIPv4 ||
                                "N/A"}
                            </span>
                            {entry.result && (
                              <Badge
                                variant={entry.result.policy === "DIRECT"
                                  ? "default"
                                  : entry.result.policy === "PROXY"
                                  ? "secondary"
                                  : "destructive"}
                                className="text-xs h-4 rounded-sm"
                              >
                                {entry.result.policy}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {testHistory.length > 10 && (
                        <div className="text-center text-xs text-muted-foreground py-2">
                          还有 {testHistory.length - 10} 条历史记录...
                        </div>
                      )}
                    </div>
                  )
                  : (
                    <div className="p-4 text-center text-muted-foreground">
                      <History className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">暂无测试历史</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: replace this with my own footer */}
      {
        /* <footer className="border-t bg-card/30 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>CLASH 规则测试器 v1.0</span>
            <span>•</span>
            <span>基于 Next.js 和 AI 构建</span>
          </div>
          <div className="flex items-center gap-2">
            <span>快捷键：</span>
            <Badge variant="outline" className="text-xs">
              Ctrl+Enter
            </Badge>
            <span>测试</span>
          </div>
        </div>
      </footer> */
      }
    </div>
  );
}
