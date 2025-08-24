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
import { Separator } from "@/components/ui/separator";
import { DataManager } from "@/components/data-management/data-manager";
import {
  PolicyAddForm,
  PolicyEditForm,
} from "@/components/data-management/policy-forms";
import {
  GeoIPAddForm,
  GeoIPEditForm,
} from "@/components/data-management/geoip-forms";
import {
  NetworkTypeAddForm,
  NetworkTypeEditForm,
} from "@/components/data-management/network-forms";
import {
  GeoSiteAddForm,
  GeoSiteEditForm,
} from "@/components/data-management/geosite-forms";
import {
  ASNAddForm,
  ASNBulkImportForm,
  ASNEditForm,
} from "@/components/data-management/asn-forms";
import { ColumnDef } from "@tanstack/react-table";
import {
  GeoIPCountryData,
  GEOSITE_CATEGORIES,
  IP_TO_ASN_MAP,
  NetworkTypeData,
  PolicyData,
} from "@/lib/clash-data-sources";

interface AISettings {
  provider: "openai" | "gemini" | "openai-compatible" | "";
  apiKey: string;
  model: string;
  endpoint?: string;
}

// 数据管理相关接口
interface PolicyItem extends PolicyData {
  id: string;
  enabled: boolean;
}

interface GeoIPItem extends GeoIPCountryData {
  id: string;
  enabled: boolean;
}

interface NetworkTypeItem extends NetworkTypeData {
  id: string;
  enabled: boolean;
}

interface GeoSiteItem {
  id: string;
  category: string;
  domains: string[];
  enabled: boolean;
}

interface ASNItem {
  id: string;
  ip: string;
  asn: string;
  enabled: boolean;
}

interface SettingsDialogProps {
  onSettingsChange: (settings: AISettings) => void;
  // 数据管理相关 props
  policies?: PolicyItem[];
  geoIPCountries?: GeoIPItem[];
  networkTypes?: NetworkTypeItem[];
  geoSiteData?: GeoSiteItem[];
  asnData?: ASNItem[];
  // 数据管理回调
  onPolicyAdd?: (policy: Omit<PolicyItem, "id">) => void;
  onPolicyEdit?: (id: string, policy: Partial<PolicyItem>) => void;
  onPolicyDelete?: (id: string) => void;
  onGeoIPAdd?: (country: Omit<GeoIPItem, "id">) => void;
  onGeoIPEdit?: (id: string, country: Partial<GeoIPItem>) => void;
  onGeoIPDelete?: (id: string) => void;
  onNetworkTypeAdd?: (networkType: Omit<NetworkTypeItem, "id">) => void;
  onNetworkTypeEdit?: (
    id: string,
    networkType: Partial<NetworkTypeItem>,
  ) => void;
  onNetworkTypeDelete?: (id: string) => void;
  onGeoSiteAdd?: (geoSite: Omit<GeoSiteItem, "id">) => void;
  onGeoSiteEdit?: (id: string, geoSite: Partial<GeoSiteItem>) => void;
  onGeoSiteDelete?: (id: string) => void;
  onASNAdd?: (asn: Omit<ASNItem, "id">) => void;
  onASNEdit?: (id: string, asn: Partial<ASNItem>) => void;
  onASNDelete?: (id: string) => void;
  // 启用/禁用状态切换回调
  onTogglePolicyEnabled?: (id: string) => void;
  onToggleGeoIPEnabled?: (id: string) => void;
  onToggleNetworkTypeEnabled?: (id: string) => void;
  onToggleGeoSiteEnabled?: (id: string) => void;
  onToggleASNEnabled?: (id: string) => void;
}

export function SettingsDialog({
  onSettingsChange,
  policies = [],
  geoIPCountries = [],
  networkTypes = [],
  geoSiteData = [],
  asnData = [],
  onPolicyAdd,
  onPolicyEdit,
  onPolicyDelete,
  onGeoIPAdd,
  onGeoIPEdit,
  onGeoIPDelete,
  onNetworkTypeAdd,
  onNetworkTypeEdit,
  onNetworkTypeDelete,
  onGeoSiteAdd,
  onGeoSiteEdit,
  onGeoSiteDelete,
  onASNAdd,
  onASNEdit,
  onASNDelete,
  onTogglePolicyEnabled,
  onToggleGeoIPEnabled,
  onToggleNetworkTypeEnabled,
  onToggleGeoSiteEnabled,
  onToggleASNEnabled,
}: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    provider: "",
    apiKey: "",
    model: "",
    endpoint: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [modelInputMode, setModelInputMode] = useState<"select" | "input">(
    "select",
  );
  const [modelInputValue, setModelInputValue] = useState("");

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("clash-ai-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        onSettingsChange(parsed);
        const predefinedModels = getModelOptions()
          .map((opt) => opt.value)
          .filter((val) => val !== "custom");
        if (parsed.model && !predefinedModels.includes(parsed.model)) {
          setUseCustomModel(true);
          setCustomModel(parsed.model);
          setModelInputMode("input");
          setModelInputValue(parsed.model);
        }
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }

    // Load custom models from localStorage
    const savedCustomModels = localStorage.getItem("clash-custom-models");
    if (savedCustomModels) {
      try {
        const parsed = JSON.parse(savedCustomModels);
        setCustomModels(parsed);
      } catch (error) {
        console.error("Failed to parse saved custom models:", error);
      }
    }
  }, [onSettingsChange]);

  const saveSettings = () => {
    localStorage.setItem("clash-ai-settings", JSON.stringify(settings));
    localStorage.setItem("clash-custom-models", JSON.stringify(customModels));
    onSettingsChange(settings);
    setOpen(false);
  };

  const updateSettings = (key: keyof AISettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setConnectionStatus("idle");
  };

  const handleModelChange = (value: string) => {
    if (value === "custom") {
      setModelInputMode("input");
      setUseCustomModel(true);
      setModelInputValue("");
    } else {
      setModelInputMode("select");
      setUseCustomModel(false);
      setModelInputValue(value);
      updateSettings("model", value);
    }
  };

  const handleCustomModelInput = (value: string) => {
    setModelInputValue(value);
    setCustomModel(value);
    updateSettings("model", value);
  };

  const saveCustomModel = () => {
    if (
      modelInputValue.trim() && !customModels.includes(modelInputValue.trim())
    ) {
      const newCustomModels = [...customModels, modelInputValue.trim()];
      setCustomModels(newCustomModels);
      updateSettings("model", modelInputValue.trim());
    }
  };

  const removeCustomModel = (modelToRemove: string) => {
    const newCustomModels = customModels.filter((model) =>
      model !== modelToRemove
    );
    setCustomModels(newCustomModels);
    if (settings.model === modelToRemove) {
      updateSettings("model", "");
      setModelInputValue("");
    }
  };

  const testConnection = async () => {
    if (!settings.provider || !settings.apiKey || !settings.model) {
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError("");

    try {
      const testPrompt = "测试连接";

      // Simple test based on provider
      let testUrl = "";
      let testHeaders: Record<string, string> = {};
      let testBody: any = {};

      switch (settings.provider) {
        case "openai":
          testUrl = "https://api.openai.com/v1/chat/completions";
          testHeaders = {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
          };
          testBody = {
            model: settings.model,
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 10,
          };
          break;
        case "gemini":
          testUrl =
            `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
          testHeaders = {
            "Content-Type": "application/json",
          };
          testBody = {
            contents: [{ parts: [{ text: testPrompt }] }],
          };
          break;
        case "openai-compatible":
          if (!settings.endpoint) {
            throw new Error("请配置 API 端点");
          }
          testUrl = `${settings.endpoint}/v1/chat/completions`;
          testHeaders = {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
          };
          testBody = {
            model: settings.model,
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 10,
          };
          break;
      }

      const response = await fetch(testUrl, {
        method: "POST",
        headers: testHeaders,
        body: JSON.stringify(testBody),
      });

      if (response.ok) {
        setConnectionStatus("success");
        if (
          modelInputMode === "input" && modelInputValue.trim() &&
          !customModels.includes(modelInputValue.trim())
        ) {
          saveCustomModel();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(
        error instanceof Error ? error.message : "连接测试失败",
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getModelOptions = () => {
    switch (settings.provider) {
      case "openai":
        return [
          { value: "gpt-4o", label: "GPT-4o (推荐)" },
          { value: "gpt-4o-mini", label: "GPT-4o Mini" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
          { value: "gpt-4", label: "GPT-4" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        ];
      case "gemini":
        return [
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (推荐)" },
          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
          { value: "gemini-pro", label: "Gemini Pro" },
        ];
      case "openai-compatible":
        return [
          { value: "gpt-4o", label: "GPT-4o" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
          { value: "gpt-4", label: "GPT-4" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
          { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
          { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
          { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
          { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
          { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
          { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
        ];
      default:
        return [];
    }
  };

  const getEndpointPlaceholder = () => {
    return "https://api.example.com 或 https://your-proxy.com/v1";
  };

  const isFormValid = () => {
    const hasBasicConfig = settings.provider && settings.apiKey &&
      settings.model;
    if (settings.provider === "openai-compatible") {
      return hasBasicConfig && settings.endpoint;
    }
    return hasBasicConfig;
  };

  const getAllModels = () => {
    const predefined = getModelOptions();
    const custom = customModels.map((model) => ({
      value: model,
      label: `${model} (自定义)`,
    }));
    return [...predefined, ...custom];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative bg-transparent hover:bg-accent/80 transition-colors rounded-md"
        >
          <Settings className="h-4 w-4" />
          {connectionStatus === "success" && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI 设置配置
            {connectionStatus === "success" && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-200 rounded-md"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                已连接
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* TODO: 结构化这部分组件，将 Tabs 和 TabsContent 拆分为单独的组件到新文件 (夹) 中。*/}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">AI 配置</TabsTrigger>
            <TabsTrigger value="models">模型管理</TabsTrigger>
            <TabsTrigger value="policies">策略管理</TabsTrigger>
            <TabsTrigger value="geoip">GeoIP</TabsTrigger>
            <TabsTrigger value="networks">网络类型</TabsTrigger>
            <TabsTrigger value="geosite">GeoSite</TabsTrigger>
            <TabsTrigger value="asn">ASN 数据</TabsTrigger>
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
                            <SelectTrigger className="hover:bg-accent/50 transition-colors rounded-md">
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
                        disabled={!isFormValid() || isTestingConnection}
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
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4" />
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
                        {customModels.map((model, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <code className="text-sm font-mono text-foreground">
                                {model}
                              </code>
                              {settings.model === model && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs rounded-sm"
                                >
                                  当前使用
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCustomModel(model)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                  : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无自定义模型</p>
                      <p className="text-xs mt-1 opacity-75">
                        在基础配置中添加自定义模型后，会显示在这里
                      </p>
                    </div>
                  )}

                <Separator />

                <div className="space-y-2">
                  <Label>常用模型名称参考</Label>
                  <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                    <div>
                      <strong>OpenAI:</strong>{" "}
                      gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4-1106-preview
                    </div>
                    <div>
                      <strong>Anthropic:</strong>{" "}
                      claude-3-5-sonnet-20241022, claude-3-opus-20240229,
                      claude-3-sonnet-20240229
                    </div>
                    <div>
                      <strong>Google:</strong>{" "}
                      gemini-1.5-pro, gemini-1.5-flash, gemini-pro
                    </div>
                    <div>
                      <strong>Meta:</strong>{" "}
                      llama-3.1-70b-versatile, llama-3.1-8b-instant
                    </div>
                    <div>
                      <strong>Mistral:</strong>{" "}
                      mixtral-8x7b-32768, mistral-large-latest
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 策略管理 */}
          <TabsContent value="policies" className="space-y-6">
            <DataManager
              config={{
                title: "策略管理",
                description:
                  "管理Clash规则中使用的策略，包括内置策略和自定义策略",
                columns: [
                  {
                    accessorKey: "name",
                    header: "策略名称",
                  },
                  {
                    accessorKey: "type",
                    header: "类型",
                    cell: ({ row }) => (
                      <Badge
                        variant={row.original.type === "built-in"
                          ? "default"
                          : "secondary"}
                      >
                        {row.original.type === "built-in" ? "内置" : "自定义"}
                      </Badge>
                    ),
                  },
                  {
                    accessorKey: "category",
                    header: "分类",
                  },
                  {
                    accessorKey: "description",
                    header: "描述",
                  },
                ] as ColumnDef<PolicyItem>[],
                searchPlaceholder: "搜索策略名称或描述...",
                emptyMessage: "暂无策略数据",
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowImport: true,
                allowExport: true,
                allowToggleEnabled: true,
              }}
              data={policies}
              onAdd={onPolicyAdd}
              onEdit={onPolicyEdit}
              onDelete={onPolicyDelete}
              onToggleEnabled={onTogglePolicyEnabled}
              renderAddForm={(onSubmit, onCancel) => (
                <PolicyAddForm onSubmit={onSubmit} onCancel={onCancel} />
              )}
              renderEditForm={(item, onSubmit, onCancel) => (
                <PolicyEditForm
                  policy={item}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                />
              )}
            />
          </TabsContent>

          {/* GeoIP 国家管理 */}
          <TabsContent value="geoip" className="space-y-6">
            <DataManager
              config={{
                title: "GeoIP国家数据",
                description: "管理用于地理位置规则的国家代码和信息",
                columns: [
                  {
                    accessorKey: "code",
                    header: "国家代码",
                  },
                  {
                    accessorKey: "name",
                    header: "国家名称",
                  },
                  {
                    accessorKey: "continent",
                    header: "大洲",
                  },
                  {
                    accessorKey: "popular",
                    header: "热门",
                    cell: ({ row }) => (
                      <Badge
                        variant={row.original.popular ? "default" : "outline"}
                      >
                        {row.original.popular ? "是" : "否"}
                      </Badge>
                    ),
                  },
                ] as ColumnDef<GeoIPItem>[],
                searchPlaceholder: "搜索国家代码或名称...",
                emptyMessage: "暂无 GeoIP 数据",
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowImport: true,
                allowExport: true,
                allowToggleEnabled: true,
              }}
              data={geoIPCountries}
              onAdd={onGeoIPAdd}
              onEdit={onGeoIPEdit}
              onDelete={onGeoIPDelete}
              onToggleEnabled={onToggleGeoIPEnabled}
              renderAddForm={(onSubmit, onCancel) => (
                <GeoIPAddForm onSubmit={onSubmit} onCancel={onCancel} />
              )}
              renderEditForm={(item, onSubmit, onCancel) => (
                <GeoIPEditForm
                  country={item}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                />
              )}
            />
          </TabsContent>

          {/* 网络类型管理 */}
          <TabsContent value="networks" className="space-y-6">
            <DataManager
              config={{
                title: "网络类型管理",
                description: "管理网络协议类型，用于网络规则匹配",
                columns: [
                  {
                    accessorKey: "type",
                    header: "协议类型",
                  },
                  {
                    accessorKey: "category",
                    header: "分类",
                    cell: ({ row }) => {
                      const categoryMap = {
                        transport: "传输层",
                        application: "应用层",
                        tunnel: "隧道协议",
                      };
                      return (
                        <Badge variant="outline">
                          {categoryMap[
                            row.original.category as keyof typeof categoryMap
                          ]}
                        </Badge>
                      );
                    },
                  },
                  {
                    accessorKey: "description",
                    header: "描述",
                  },
                ] as ColumnDef<NetworkTypeItem>[],
                searchPlaceholder: "搜索协议类型或描述...",
                emptyMessage: "暂无网络类型数据",
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowImport: true,
                allowExport: true,
                allowToggleEnabled: true,
              }}
              data={networkTypes}
              onAdd={onNetworkTypeAdd}
              onEdit={onNetworkTypeEdit}
              onDelete={onNetworkTypeDelete}
              onToggleEnabled={onToggleNetworkTypeEnabled}
              renderAddForm={(onSubmit, onCancel) => (
                <NetworkTypeAddForm onSubmit={onSubmit} onCancel={onCancel} />
              )}
              renderEditForm={(item, onSubmit, onCancel) => (
                <NetworkTypeEditForm
                  networkType={item}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                />
              )}
            />
          </TabsContent>

          {/* GeoSite 管理 */}
          <TabsContent value="geosite" className="space-y-6">
            <DataManager
              config={{
                title: "GeoSite域名分类",
                description: "管理域名分类，用于基于网站类别的规则匹配",
                columns: [
                  {
                    accessorKey: "category",
                    header: "分类名称",
                  },
                  {
                    accessorKey: "domains",
                    header: "域名数量",
                    cell: ({ row }) => (
                      <Badge variant="secondary">
                        {row.original.domains.length} 个域名
                      </Badge>
                    ),
                  },
                  {
                    id: "preview",
                    header: "域名预览",
                    cell: ({ row }) => (
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {row.original.domains.slice(0, 3).join(", ")}
                        {row.original.domains.length > 3 && "..."}
                      </div>
                    ),
                  },
                ] as ColumnDef<GeoSiteItem>[],
                searchPlaceholder: "搜索分类名称...",
                emptyMessage: "暂无 GeoSite 数据",
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowImport: true,
                allowExport: true,
                allowToggleEnabled: true,
              }}
              data={geoSiteData}
              onAdd={onGeoSiteAdd}
              onEdit={onGeoSiteEdit}
              onDelete={onGeoSiteDelete}
              onToggleEnabled={onToggleGeoSiteEnabled}
              renderAddForm={(onSubmit, onCancel) => (
                <GeoSiteAddForm onSubmit={onSubmit} onCancel={onCancel} />
              )}
              renderEditForm={(item, onSubmit, onCancel) => (
                <GeoSiteEditForm
                  geosite={item}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                />
              )}
            />
          </TabsContent>

          {/* ASN 数据管理 */}
          <TabsContent value="asn" className="space-y-6">
            <DataManager
              config={{
                title: "ASN数据管理",
                description: "管理IP地址到自治系统编号(ASN)的映射关系",
                columns: [
                  {
                    accessorKey: "ip",
                    header: "IP地址",
                  },
                  {
                    accessorKey: "asn",
                    header: "ASN编号",
                    cell: ({ row }) => (
                      <Badge variant="outline">
                        {row.original.asn}
                      </Badge>
                    ),
                  },
                ] as ColumnDef<ASNItem>[],
                searchPlaceholder: "搜索 IP 地址或 ASN...",
                emptyMessage: "暂无 ASN 数据",
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowImport: true,
                allowExport: true,
                allowToggleEnabled: true,
              }}
              data={asnData}
              onAdd={onASNAdd}
              onEdit={onASNEdit}
              onDelete={onASNDelete}
              onToggleEnabled={onToggleASNEnabled}
              renderAddForm={(onSubmit, onCancel) => (
                <ASNAddForm onSubmit={onSubmit} onCancel={onCancel} />
              )}
              renderEditForm={(item, onSubmit, onCancel) => (
                <ASNEditForm
                  asnData={item}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                />
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
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
            保存设置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
