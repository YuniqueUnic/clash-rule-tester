"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { GeoSiteItem } from "@/contexts/data-context";

// GeoSite 表单数据接口
export interface GeoSiteFormData {
  category: string;
  domains: string[];
  enabled: boolean;
}

// GeoSite 添加表单
export function GeoSiteAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: GeoSiteFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<GeoSiteFormData>({
    category: "",
    domains: [],
    enabled: true, // 新 GeoSite 项目默认启用
  });

  const [domainInput, setDomainInput] = useState("");
  const [errors, setErrors] = useState<{
    category?: string;
    domains?: string;
    domainInput?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.category.trim()) {
      newErrors.category = "分类名称不能为空";
    } else if (!/^[a-z][a-z0-9-]*$/i.test(formData.category)) {
      newErrors.category =
        "分类名称只能包含字母、数字和连字符，且必须以字母开头";
    }

    if (formData.domains.length === 0) {
      newErrors.domains = "至少需要添加一个域名";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDomain = (domain: string) => {
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  };

  const addDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (!domain) {
      setErrors({ ...errors, domainInput: "域名不能为空" });
      return;
    }

    if (!validateDomain(domain)) {
      setErrors({ ...errors, domainInput: "请输入有效的域名格式" });
      return;
    }

    if (formData.domains.includes(domain)) {
      setErrors({ ...errors, domainInput: "域名已存在" });
      return;
    }

    setFormData({
      ...formData,
      domains: [...formData.domains, domain],
    });
    setDomainInput("");
    setErrors({ ...errors, domainInput: undefined });
  };

  const removeDomain = (domain: string) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter((d) => d !== domain),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        category: formData.category.toLowerCase(),
      });
    }
  };

  const handleDomainKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
  };

  const parseBulkDomains = (text: string) => {
    const domains = text
      .split(/[\n,;]/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d && validateDomain(d))
      .filter((d) => !formData.domains.includes(d));

    if (domains.length > 0) {
      setFormData({
        ...formData,
        domains: [...formData.domains, ...domains],
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="geosite-category">分类名称 *</Label>
        <Input
          id="geosite-category"
          value={formData.category}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value.toLowerCase(),
            })}
          placeholder="例如：google, facebook, streaming"
          className={errors.category ? "border-destructive" : ""}
        />
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category}</p>
        )}
        <p className="text-xs text-muted-foreground">
          分类名称用于在规则中引用，建议使用小写字母
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain-input">添加域名 *</Label>
        <div className="flex space-x-2">
          <Input
            id="domain-input"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyPress={handleDomainKeyPress}
            placeholder="例如：google.com"
            className={errors.domainInput ? "border-destructive" : ""}
          />
          <Button type="button" onClick={addDomain}>
            添加
          </Button>
        </div>
        {errors.domainInput && (
          <p className="text-sm text-destructive">{errors.domainInput}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>批量添加域名</Label>
        <Textarea
          placeholder="每行一个域名，或用逗号、分号分隔&#10;例如:&#10;google.com&#10;youtube.com&#10;googlevideo.com&#10;&#10;输入完成后按Ctrl+Enter或失去焦点时自动添加"
          rows={3}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              parseBulkDomains(e.target.value);
              e.target.value = "";
            }
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === "Enter") {
              if (e.currentTarget.value.trim()) {
                parseBulkDomains(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          支持换行、逗号或分号分隔的多个域名。输入完成后按 Ctrl+Enter
          或点击其他地方自动添加
        </p>
      </div>

      <div className="space-y-2">
        <Label>已添加的域名 ({formData.domains.length})</Label>
        {formData.domains.length > 0
          ? (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
              {formData.domains.map((domain) => (
                <Badge
                  key={domain}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {domain}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeDomain(domain)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )
          : <p className="text-sm text-muted-foreground">暂无域名</p>}
        {errors.domains && (
          <p className="text-sm text-destructive">{errors.domains}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">添加分类</Button>
      </DialogFooter>
    </form>
  );
}

// GeoSite 编辑表单
export function GeoSiteEditForm({
  geosite,
  onSubmit,
  onCancel,
}: {
  geosite: GeoSiteItem;
  onSubmit: (data: Partial<GeoSiteFormData>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<GeoSiteFormData>({
    category: geosite.category,
    domains: [...geosite.domains],
    enabled: geosite.enabled, // 使用现有的 enabled 状态
  });

  const [domainInput, setDomainInput] = useState("");
  const [errors, setErrors] = useState<{
    category?: string;
    domains?: string;
    domainInput?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.category.trim()) {
      newErrors.category = "分类名称不能为空";
    } else if (!/^[a-z][a-z0-9-]*$/i.test(formData.category)) {
      newErrors.category =
        "分类名称只能包含字母、数字和连字符，且必须以字母开头";
    }

    if (formData.domains.length === 0) {
      newErrors.domains = "至少需要添加一个域名";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDomain = (domain: string) => {
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  };

  const addDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (!domain) {
      setErrors({ ...errors, domainInput: "域名不能为空" });
      return;
    }

    if (!validateDomain(domain)) {
      setErrors({ ...errors, domainInput: "请输入有效的域名格式" });
      return;
    }

    if (formData.domains.includes(domain)) {
      setErrors({ ...errors, domainInput: "域名已存在" });
      return;
    }

    setFormData({
      ...formData,
      domains: [...formData.domains, domain],
    });
    setDomainInput("");
    setErrors({ ...errors, domainInput: undefined });
  };

  const removeDomain = (domain: string) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter((d) => d !== domain),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        category: formData.category.toLowerCase(),
      });
    }
  };

  const handleDomainKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-geosite-category">分类名称 *</Label>
        <Input
          id="edit-geosite-category"
          value={formData.category}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value.toLowerCase(),
            })}
          placeholder="例如：google, facebook, streaming"
          className={errors.category ? "border-destructive" : ""}
        />
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-domain-input">添加域名</Label>
        <div className="flex space-x-2">
          <Input
            id="edit-domain-input"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyPress={handleDomainKeyPress}
            placeholder="例如：google.com"
            className={errors.domainInput ? "border-destructive" : ""}
          />
          <Button type="button" onClick={addDomain}>
            添加
          </Button>
        </div>
        {errors.domainInput && (
          <p className="text-sm text-destructive">{errors.domainInput}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>已添加的域名 ({formData.domains.length})</Label>
        {formData.domains.length > 0
          ? (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
              {formData.domains.map((domain) => (
                <Badge
                  key={domain}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {domain}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeDomain(domain)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )
          : <p className="text-sm text-muted-foreground">暂无域名</p>}
        {errors.domains && (
          <p className="text-sm text-destructive">{errors.domains}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">保存更改</Button>
      </DialogFooter>
    </form>
  );
}
