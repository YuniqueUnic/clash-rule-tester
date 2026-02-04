"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PolicyItem } from "@/contexts/data-context";

// 策略表单数据接口
export interface PolicyFormData {
  name: string;
  type: "built-in" | "custom";
  description: string;
  category: string;
  enabled: boolean;
}

// 策略添加表单
export function PolicyAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: PolicyFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<PolicyFormData>({
    name: "",
    type: "custom",
    description: "",
    category: "custom",
    enabled: true, // 新策略默认启用
  });

  const [errors, setErrors] = useState<Partial<PolicyFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<PolicyFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "策略名称不能为空";
    } else if (!/^[A-Z][A-Z0-9_-]*$/i.test(formData.name)) {
      newErrors.name =
        "策略名称只能包含字母、数字、下划线和连字符，且必须以字母开头";
    }

    if (!formData.description.trim()) {
      newErrors.description = "策略描述不能为空";
    }

    if (!formData.category.trim()) {
      newErrors.category = "策略分类不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const predefinedCategories = [
    "basic",
    "proxy",
    "direct",
    "reject",
    "custom",
    "load-balance",
    "fallback",
    "url-test",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="policy-name">策略名称 *</Label>
        <Input
          id="policy-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例如：MY_PROXY"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-type">策略类型</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "built-in" | "custom") =>
            setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">自定义策略</SelectItem>
            <SelectItem value="built-in">内置策略</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-category">策略分类 *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData({ ...formData, category: value })}
        >
          <SelectTrigger
            className={errors.category ? "border-destructive" : ""}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {predefinedCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-description">策略描述 *</Label>
        <Textarea
          id="policy-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })}
          placeholder="描述这个策略的用途和功能..."
          className={errors.description ? "border-destructive" : ""}
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">添加策略</Button>
      </DialogFooter>
    </form>
  );
}

// 策略编辑表单
export function PolicyEditForm({
  policy,
  onSubmit,
  onCancel,
}: {
  policy: PolicyItem;
  onSubmit: (data: Partial<PolicyFormData>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<PolicyFormData>({
    name: policy.name,
    type: policy.type,
    description: policy.description,
    category: policy.category,
    enabled: policy.enabled, // 使用现有的 enabled 状态
  });

  const [errors, setErrors] = useState<Partial<PolicyFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<PolicyFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "策略名称不能为空";
    } else if (!/^[A-Z][A-Z0-9_-]*$/i.test(formData.name)) {
      newErrors.name =
        "策略名称只能包含字母、数字、下划线和连字符，且必须以字母开头";
    }

    if (!formData.description.trim()) {
      newErrors.description = "策略描述不能为空";
    }

    if (!formData.category.trim()) {
      newErrors.category = "策略分类不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const predefinedCategories = [
    "basic",
    "proxy",
    "direct",
    "reject",
    "custom",
    "load-balance",
    "fallback",
    "url-test",
  ];

  const isBuiltIn = policy.type === "built-in";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isBuiltIn && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Badge variant="secondary">内置策略</Badge>
            内置策略的名称和类型不能修改
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="edit-policy-name">策略名称 *</Label>
        <Input
          id="edit-policy-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例如：MY_PROXY"
          disabled={isBuiltIn}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-policy-type">策略类型</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "built-in" | "custom") =>
            setFormData({ ...formData, type: value })}
          disabled={isBuiltIn}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">自定义策略</SelectItem>
            <SelectItem value="built-in">内置策略</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-policy-category">策略分类 *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData({ ...formData, category: value })}
        >
          <SelectTrigger
            className={errors.category ? "border-destructive" : ""}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {predefinedCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-policy-description">策略描述 *</Label>
        <Textarea
          id="edit-policy-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })}
          placeholder="描述这个策略的用途和功能..."
          className={errors.description ? "border-destructive" : ""}
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
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
