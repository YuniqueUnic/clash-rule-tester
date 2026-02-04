"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Save,
  Settings,
  TestTube,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIService } from "@/lib/ai-service";
import type { AISettings } from "@/lib/ai/types";
import { usePersistentAISettings } from "@/hooks/use-persistent-state";

interface AIConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange?: (settings: AISettings) => void;
}

const defaultAISettings = {
  provider: "",
  apiKey: "",
  model: "",
  endpoint: "",
};

export function AIConfigurationDialog({
  open,
  onOpenChange,
  onSettingsChange,
}: AIConfigurationDialogProps) {
  // AI 配置状态 - 使用持久化存储
  const [settings, setSettings] = usePersistentAISettings(defaultAISettings);

  // UI 状态
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelInputMode, setModelInputMode] = useState<"select" | "input">(
    "select",
  );
  const [modelInputValue, setModelInputValue] = useState("");
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // 初始化模型输入值
  useEffect(() => {
    setModelInputValue(settings.model || "");
  }, [settings.model]);

  // 更新设置
  const updateSettings = (key: keyof AISettings, value: string) => {
    setSettings({ ...settings, [key]: value });
    setConnectionStatus("idle");
  };

  // 获取端点占位符
  const getEndpointPlaceholder = () => {
    switch (settings.provider) {
      case "openai-compatible":
        return "https://api.example.com/v1";
      default:
        return "输入 API 端点 URL";
    }
  };

  // 获取所有可用模型
  const getAllModels = () => {
    // 如果有动态获取的模型列表，优先使用
    if (availableModels.length > 0) {
      const dynamicModels = availableModels.map((model) => ({
        value: model,
        label: model,
        source: "api" as const,
      }));

      // 添加自定义模型，但要避免与 API 模型重复
      const customModelOptions = customModels
        .filter((model) => !availableModels.includes(model)) // 过滤掉重复的
        .map((model) => ({
          value: model,
          label: `${model} (自定义)`,
          source: "custom" as const,
        }));

      // 对于重复的模型，修改 API 版本的 label 来标注
      const duplicateModels = customModels.filter((model) =>
        availableModels.includes(model)
      );

      // 修改动态模型的 label，如果有重复的自定义模型
      const enhancedDynamicModels = dynamicModels.map((model) => ({
        ...model,
        label: duplicateModels.includes(model.value)
          ? `${model.value} (API + 自定义)`
          : model.label,
      }));

      return [
        ...enhancedDynamicModels,
        ...customModelOptions,
      ];
    }

    // 回退到内置模型列表
    const builtInModels = {
      openai: [
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-4o-mini", label: "GPT-4o Mini" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      ],
      gemini: [
        { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
        { value: "gemini-pro", label: "Gemini Pro" },
      ],
      "openai-compatible": [
        { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
        { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
      ],
    };

    const providerModels =
      builtInModels[settings.provider as keyof typeof builtInModels] || [];
    const customModelOptions = customModels.map((model) => ({
      value: model,
      label: `${model} (自定义)`,
    }));

    return [...providerModels, ...customModelOptions];
  };

  // 处理自定义模型输入
  const handleCustomModelInput = (value: string) => {
    setModelInputValue(value);
    updateSettings("model", value);
  };

  // 保存自定义模型
  const saveCustomModel = () => {
    const modelName = modelInputValue.trim();
    if (modelName && !customModels.includes(modelName)) {
      const newCustomModels = [...customModels, modelName];
      setCustomModels(newCustomModels);
      localStorage.setItem("custom-models", JSON.stringify(newCustomModels));
    }
  };

  // 删除自定义模型
  const deleteCustomModel = (modelToDelete: string) => {
    const newCustomModels = customModels.filter((model) =>
      model !== modelToDelete
    );
    setCustomModels(newCustomModels);
    localStorage.setItem("custom-models", JSON.stringify(newCustomModels));

    // 如果删除的是当前选中的模型，清空选择
    if (settings.model === modelToDelete) {
      updateSettings("model", "");
      setModelInputValue("");
    }
  };

  // 测试连接并获取模型列表
  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError("");
    setAvailableModels([]);

    try {
      // 创建 AI 服务实例并获取模型列表
      const aiService = new AIService(settings);
      const result = await aiService.getAvailableModels();

      if (result.success && result.models) {
        setConnectionStatus("success");
        setAvailableModels(result.models);

        const firstModel = result.models[0];
        if (firstModel && (!settings.model || !result.models.includes(settings.model))) {
          setSettings((prev: AISettings) => ({ ...prev, model: firstModel }));
          setModelInputValue(firstModel);
          setModelInputMode("select");
        }
      } else {
        setConnectionStatus("error");
        setConnectionError(result.error || "连接测试失败");
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(error instanceof Error ? error.message : "未知错误");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 验证表单（用于保存配置）
  const isFormValid = () => {
    if (!settings.provider || !settings.apiKey || !settings.model) {
      return false;
    }
    if (settings.provider === "openai-compatible" && !settings.endpoint) {
      return false;
    }
    return true;
  };

  // 验证测试连接（不需要 model）
  const isTestConnectionValid = () => {
    if (!settings.provider || !settings.apiKey) {
      return false;
    }
    if (settings.provider === "openai-compatible" && !settings.endpoint) {
      return false;
    }
    return true;
  };

  // 保存设置
  const saveSettings = () => {
    // 设置已经通过持久化 hooks 自动保存
    onSettingsChange?.(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          AI 配置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 配置</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">AI 配置</TabsTrigger>
            <TabsTrigger value="models">模型管理</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AI 提供商配置</CardTitle>
                <CardDescription>
                  配置您的 AI 提供商以启用规则优化和解释功能。支持
                  OpenAI、Google Gemini 和兼容 OpenAI API 的服务。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">AI 提供商</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={(value) => updateSettings("provider", value)}
                  >
                    <SelectTrigger className="hover:bg-accent/50 transition-colors rounded-md">
                      <SelectValue placeholder="选择 AI 提供商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="openai-compatible">
                        OpenAI 兼容 API
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.provider === "openai-compatible" && (
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">API 端点</Label>
                    <Input
                      id="endpoint"
                      value={settings.endpoint || ""}
                      onChange={(e) =>
                        updateSettings("endpoint", e.target.value)}
                      placeholder={getEndpointPlaceholder()}
                      className="hover:bg-accent/50 transition-colors rounded-md"
                    />
                    <p className="text-xs text-muted-foreground opacity-40">
                      输入兼容 OpenAI API 的服务端点，如 Claude
                      API、本地部署的模型等
                    </p>
                  </div>
                )}

                {settings.provider && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API 密钥</Label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? "text" : "password"}
                          value={settings.apiKey}
                          onChange={(e) =>
                            updateSettings("apiKey", e.target.value)}
                          placeholder={`输入您的 ${
                            settings.provider === "openai"
                              ? "OpenAI"
                              : settings.provider === "gemini"
                              ? "Gemini"
                              : "API"
                          } 密钥`}
                          className="pr-10 hover:bg-accent/50 transition-colors rounded-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-accent/50 transition-colors"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>模型选择</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={modelInputMode === "select"
                            ? "default"
                            : "outline"}
                          size="sm"
                          onClick={() => setModelInputMode("select")}
                          className="rounded-md"
                        >
                          预设模型
                        </Button>
                        <Button
                          type="button"
                          variant={modelInputMode === "input"
                            ? "default"
                            : "outline"}
                          size="sm"
                          onClick={() => setModelInputMode("input")}
                          className="rounded-md"
                        >
                          自定义模型
                        </Button>
                      </div>

                      {modelInputMode === "select"
                        ? (
                          <Select
                            value={settings.model}
                            onValueChange={(value) => {
                              updateSettings("model", value);
                              setModelInputValue(value);
                            }}
                          >
                            <SelectTrigger className="w-full hover:bg-accent/50 transition-colors rounded-md">
                              <SelectValue placeholder="选择预设模型" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllModels().map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                        : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={modelInputValue}
                                onChange={(e) =>
                                  handleCustomModelInput(e.target.value)}
                                placeholder="输入完整的模型名称，如：gpt-4o, claude-3-5-sonnet-20241022"
                                className="flex-1 hover:bg-accent/50 transition-colors rounded-md"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={saveCustomModel}
                                disabled={!modelInputValue.trim() ||
                                  customModels.includes(modelInputValue.trim())}
                                className="rounded-md bg-transparent"
                                title="保存到自定义模型列表"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground opacity-40">
                              输入完整的模型名称，确保与 API
                              提供商支持的模型名称一致。测试成功后会自动保存到模型列表。
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testConnection}
                        disabled={!isTestConnectionValid() ||
                          isTestingConnection}
                        className="flex-1 bg-transparent hover:bg-accent/80 transition-colors rounded-md"
                      >
                        {isTestingConnection
                          ? (
                            <>
                              <TestTube className="h-4 w-4 mr-2 animate-spin" />
                              测试连接中...
                            </>
                          )
                          : (
                            <>
                              <TestTube className="h-4 w-4 mr-2" />
                              测试连接
                            </>
                          )}
                      </Button>
                      {connectionStatus === "success" && (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {availableModels.length > 0 && (
                            <span>找到 {availableModels.length} 个模型</span>
                          )}
                        </div>
                      )}
                      {connectionStatus === "error" && (
                        <div className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {connectionStatus === "error" && connectionError && (
                      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 rounded-md">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          连接失败：{connectionError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {connectionStatus === "success" && (
                      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          连接成功！AI 功能已可用。
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">自定义模型管理</CardTitle>
                <CardDescription>
                  管理您保存的自定义模型列表。这些模型将在模型选择中显示，方便快速选择。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customModels.length > 0
                  ? (
                    <div className="space-y-2">
                      <Label>已保存的自定义模型</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {customModels.map((model) => (
                          <div
                            key={model}
                            className="flex items-center justify-between p-3 border rounded-md bg-accent/20 hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                自定义
                              </Badge>
                              <span className="font-mono text-sm">{model}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCustomModel(model)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/20 rounded-md"
                              title="删除模型"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                  : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无自定义模型</p>
                      <p className="text-xs mt-1">
                        在 AI 配置中输入自定义模型名称并保存
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t space-y-3">
          <p className="text-xs text-muted-foreground">
            💡 提示：AI 配置保存后将应用到规则优化和解释功能
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="hover:bg-accent/80 transition-colors rounded-md"
            >
              取消
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!isFormValid()}
              className="hover:scale-[1.02] hover:shadow-sm transition-transform rounded-md"
            >
              <Save className="h-4 w-4 mr-2" />
              保存 AI 配置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
