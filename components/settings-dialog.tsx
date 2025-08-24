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
import { Download, HardDrive, Settings, Trash2, Upload } from "lucide-react";
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
import { storage } from "@/lib/storage-manager";
import { useToast } from "@/hooks/use-toast";

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
          <DialogTitle>数据管理</DialogTitle>
        </DialogHeader>

        {/* 数据管理标签页 */}
        <Tabs defaultValue="policies" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="policies">策略管理</TabsTrigger>
            <TabsTrigger value="geoip">GeoIP</TabsTrigger>
            <TabsTrigger value="networks">网络类型</TabsTrigger>
            <TabsTrigger value="geosite">GeoSite</TabsTrigger>
            <TabsTrigger value="asn">ASN 数据</TabsTrigger>
            <TabsTrigger value="storage">存储管理</TabsTrigger>
          </TabsList>

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

          {/* 存储管理 */}
          <TabsContent value="storage" className="space-y-6">
            <StorageManagement />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 存储管理组件
 */
function StorageManagement() {
  const { toast } = useToast();
  const [storageInfo, setStorageInfo] = useState(storage.info());
  const [showResetDialog, setShowResetDialog] = useState(false);

  // 刷新存储信息
  const refreshStorageInfo = () => {
    setStorageInfo(storage.info());
  };

  // 重置所有数据
  const handleReset = () => {
    const success = storage.clear();
    if (success) {
      toast({
        title: "重置成功",
        description: "所有本地存储数据已清空",
      });
      refreshStorageInfo();
      // 刷新页面以重新加载默认状态
      window.location.reload();
    } else {
      toast({
        title: "重置失败",
        description: "无法清空本地存储数据",
        variant: "destructive",
      });
    }
    setShowResetDialog(false);
  };

  // 导出数据
  const handleExport = () => {
    try {
      const data = storage.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clash-ruler-backup-${
        new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "数据已导出为 JSON 文件",
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: "无法导出数据",
        variant: "destructive",
      });
    }
  };

  // 导入数据
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            const success = storage.import(data);
            if (success) {
              toast({
                title: "导入成功",
                description: "数据已成功导入，页面将刷新",
              });
              setTimeout(() => window.location.reload(), 1000);
            } else {
              toast({
                title: "导入失败",
                description: "无法导入数据",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "导入失败",
              description: "文件格式不正确",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">本地存储管理</h3>
        <p className="text-sm text-muted-foreground">
          管理应用的本地存储数据，包括编辑器内容、设置和测试历史等。
        </p>
      </div>

      {/* 存储信息 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">存储使用情况</h4>
          <Button variant="outline" size="sm" onClick={refreshStorageInfo}>
            刷新
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">总大小</span>
            </div>
            <div className="text-2xl font-bold">
              {formatSize(storageInfo.totalSize)}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">存储项数量</span>
            </div>
            <div className="text-2xl font-bold">{storageInfo.itemCount}</div>
          </div>
        </div>

        {/* 存储项详情 */}
        {storageInfo.items.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium">存储项详情</h5>
            <div className="space-y-1">
              {storageInfo.items.map((item) => (
                <div
                  key={item.key}
                  className="flex justify-between items-center p-2 bg-muted rounded"
                >
                  <span className="text-sm font-mono">{item.key}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatSize(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">数据管理</h4>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            导入数据
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowResetDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            重置所有数据
          </Button>
        </div>
      </div>

      {/* 重置确认对话框 */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重置所有数据</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              此操作将清空所有本地存储的数据，包括：
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>编辑器内容和历史记录</li>
              <li>AI 设置和应用配置</li>
              <li>测试参数和测试历史</li>
              <li>测试指标和统计数据</li>
              <li>其他所有应用状态</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              此操作不可撤销，请确认您要继续。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
              >
                取消
              </Button>
              <Button variant="destructive" onClick={handleReset}>
                确认重置
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
