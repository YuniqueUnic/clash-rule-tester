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
import {
  AlertTriangle,
  CheckCircle,
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
  successRate: number;
  lastTestTime: number;
}

export default function ClashRuleTester() {
  const [rules, setRules] = useState(SAMPLE_RULES);
  const [testDomain, setTestDomain] = useState("www.google.com");
  const [testIP, setTestIP] = useState("8.8.8.8");
  const [testPort, setTestPort] = useState("443");
  const [testProcess, setTestProcess] = useState("chrome.exe");
  const [testProcessPath, setTestProcessPath] = useState("/usr/bin/chrome");
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
    successRate: 0,
    lastTestTime: 0,
  });
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);

  const [policies, setPolicies] = useState<Policy[]>([
    { id: "1", name: "DIRECT", comment: "直连，不使用代理" },
    { id: "2", name: "PROXY", comment: "使用代理服务器" },
    { id: "3", name: "REJECT", comment: "拒绝连接" },
  ]);
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
    testIP,
    testPort,
    testProcess,
    testProcessPath,
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
      domain: testDomain,
      ip: testIP,
      port: testPort,
      process: testProcess,
      processPath: testProcessPath,
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
      const newSuccessRate = result
        ? ((prev.successRate * prev.totalTests + 1) / newTotal) * 100
        : ((prev.successRate * prev.totalTests) / newTotal) * 100;

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
    testIP,
    testPort,
    testProcess,
    testProcessPath,
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
      successRate: 0,
      lastTestTime: 0,
    });
    toast({
      title: "历史已清除",
      description: "所有测试历史和指标已清除",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                C
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                CLASH 规则测试器
              </h1>
              <p className="text-sm text-muted-foreground">
                专业的规则引擎测试工具
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HelpDialog />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:bg-accent/80 transition-colors bg-transparent"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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

      <div className="flex h-[calc(100vh-80px)]">
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
                          {new Date(policy.id).toLocaleTimeString()}
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

                <Button
                  variant="outline"
                  className="w-full bg-transparent rounded-md"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  导入策略
                </Button>
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

        {/* Middle Column: Rule Editor */}
        <div className="flex-1">
          <div className="h-full bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  规则配置
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs rounded-md">
                    {ruleEngine.getRuleCount()} 条规则
                  </Badge>
                  {validationResults.length === 0
                    ? (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 rounded-md"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        有效
                      </Badge>
                    )
                    : (
                      <Badge
                        variant="destructive"
                        className="text-xs rounded-md"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {validationResults.length} 个问题
                      </Badge>
                    )}
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-80px)] p-4">
              <ClashRuleEditor
                value={rules}
                onChange={setRules}
                highlightedLine={matchResult?.lineNumber}
                className="h-full"
              />
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
                <div className="space-y-2">
                  <Label htmlFor="test-domain" className="text-foreground">
                    域名
                  </Label>
                  <Input
                    id="test-domain"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="www.example.com"
                    className="hover:bg-accent/60 transition-colors rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-ip" className="text-foreground">
                    IP 地址
                  </Label>
                  <Input
                    id="test-ip"
                    value={testIP}
                    onChange={(e) => setTestIP(e.target.value)}
                    placeholder="8.8.8.8"
                    className="hover:bg-accent/60 transition-colors rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-port" className="text-foreground">
                    端口
                  </Label>
                  <Input
                    id="test-port"
                    value={testPort}
                    onChange={(e) => setTestPort(e.target.value)}
                    placeholder="443"
                    className="hover:bg-accent/60 transition-colors rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-process" className="text-foreground">
                    进程
                  </Label>
                  <Input
                    id="test-process"
                    value={testProcess}
                    onChange={(e) => setTestProcess(e.target.value)}
                    placeholder="chrome.exe"
                    className="hover:bg-accent/60 transition-colors rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="test-process-path"
                    className="text-foreground"
                  >
                    进程路径
                  </Label>
                  <Input
                    id="test-process-path"
                    value={testProcessPath}
                    onChange={(e) => setTestProcessPath(e.target.value)}
                    placeholder="/usr/bin/chrome"
                    className="hover:bg-accent/60 transition-colors rounded-md"
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

            {/* Enhanced Match Result Panel */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    匹配结果
                  </h3>
                  {isTestingInProgress && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      测试中...
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                {matchResult
                  ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className="rounded-md text-xs font-mono"
                          >
                            第 {matchResult.lineNumber} 行
                          </Badge>
                          <Badge
                            variant={matchResult.policy === "DIRECT"
                              ? "default"
                              : matchResult.policy === "PROXY"
                              ? "secondary"
                              : "destructive"}
                            className="hover:scale-105 transition-transform rounded-md font-semibold"
                          >
                            {matchResult.policy}
                          </Badge>
                        </div>
                        <code className="text-sm font-mono text-foreground block p-2 bg-white/50 dark:bg-black/20 rounded border">
                          {matchResult.rule}
                        </code>
                      </div>

                      <div className="space-y-3">
                        <div className="p-4 bg-muted/40 rounded-lg border border-muted hover:bg-muted/60 transition-colors">
                          <div className="flex items-start gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="font-medium text-sm text-foreground">
                              详细匹配信息
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="p-3 bg-background/80 rounded-md border border-border/50">
                              <div className="text-foreground/90 leading-relaxed">
                                {matchResult.detailedExplanation}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 mt-3">
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
                          <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-sm transition-all duration-200">
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
                    </div>
                  )
                  : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">运行测试查看结果</p>
                      <p className="text-xs mt-1 opacity-75">
                        {autoTest ? "自动测试已启用" : "按 Ctrl+Enter 快速测试"}
                      </p>
                    </div>
                  )}
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
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{entry.duration.toFixed(1)}ms</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono">
                              {entry.request.domain || entry.request.ip ||
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

      <footer className="border-t bg-card/30 px-6 py-3">
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
      </footer>
    </div>
  );
}
