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
import { NetworkTypeItem } from "@/contexts/data-context";

// 网络类型表单数据接口
export interface NetworkTypeFormData {
  type: string;
  description: string;
  category: "transport" | "application" | "tunnel";
  enabled: boolean;
}

// 网络类型添加表单
export function NetworkTypeAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: NetworkTypeFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<NetworkTypeFormData>({
    type: "",
    description: "",
    category: "transport",
    enabled: true, // 新网络类型默认启用
  });

  const [errors, setErrors] = useState<Partial<NetworkTypeFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<NetworkTypeFormData> = {};

    if (!formData.type.trim()) {
      newErrors.type = "网络类型不能为空";
    } else if (!/^[A-Z][A-Z0-9]*$/i.test(formData.type)) {
      newErrors.type = "网络类型只能包含字母和数字，且必须以字母开头";
    }

    if (!formData.description.trim()) {
      newErrors.description = "描述不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        type: formData.type.toUpperCase(),
      });
    }
  };

  const categories = [
    { value: "transport", label: "传输层协议" },
    { value: "application", label: "应用层协议" },
    { value: "tunnel", label: "隧道协议" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="network-type">网络类型 *</Label>
        <Input
          id="network-type"
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value.toUpperCase() })}
          placeholder="例如：TCP, UDP, HTTP"
          className={errors.type ? "border-destructive" : ""}
        />
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type}</p>
        )}
        <p className="text-xs text-muted-foreground">
          网络协议类型，通常使用大写字母
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="network-category">协议分类 *</Label>
        <Select
          value={formData.category}
          onValueChange={(value: "transport" | "application" | "tunnel") =>
            setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="network-description">协议描述 *</Label>
        <Textarea
          id="network-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })}
          placeholder="描述这个网络协议的用途和特点..."
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
        <Button type="submit">添加网络类型</Button>
      </DialogFooter>
    </form>
  );
}

// 网络类型编辑表单
export function NetworkTypeEditForm({
  networkType,
  onSubmit,
  onCancel,
}: {
  networkType: NetworkTypeItem;
  onSubmit: (data: Partial<NetworkTypeFormData>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<NetworkTypeFormData>({
    type: networkType.type,
    description: networkType.description,
    category: networkType.category,
    enabled: networkType.enabled, // 使用现有的 enabled 状态
  });

  const [errors, setErrors] = useState<Partial<NetworkTypeFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<NetworkTypeFormData> = {};

    if (!formData.type.trim()) {
      newErrors.type = "网络类型不能为空";
    } else if (!/^[A-Z][A-Z0-9]*$/i.test(formData.type)) {
      newErrors.type = "网络类型只能包含字母和数字，且必须以字母开头";
    }

    if (!formData.description.trim()) {
      newErrors.description = "描述不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        type: formData.type.toUpperCase(),
      });
    }
  };

  const categories = [
    { value: "transport", label: "传输层协议" },
    { value: "application", label: "应用层协议" },
    { value: "tunnel", label: "隧道协议" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-network-type">网络类型 *</Label>
        <Input
          id="edit-network-type"
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value.toUpperCase() })}
          placeholder="例如：TCP, UDP, HTTP"
          className={errors.type ? "border-destructive" : ""}
        />
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type}</p>
        )}
        <p className="text-xs text-muted-foreground">
          网络协议类型，通常使用大写字母
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-network-category">协议分类 *</Label>
        <Select
          value={formData.category}
          onValueChange={(value: "transport" | "application" | "tunnel") =>
            setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-network-description">协议描述 *</Label>
        <Textarea
          id="edit-network-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })}
          placeholder="描述这个网络协议的用途和特点..."
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
